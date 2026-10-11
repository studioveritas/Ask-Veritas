import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, TRUTH_PROMPT } from "@/lib/prompt";
import { checkLimits, getStore, readLimits } from "@/lib/limits";
import {
  clientIp,
  hashVisitor,
  isAllowedOrigin,
  looksLikeInjection,
  parseMode,
  validateMessages,
} from "@/lib/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.ASK_VERITAS_MODEL || "claude-haiku-5-5";
const MAX_OUTPUT_TOKENS = Number(process.env.ASK_MAX_OUTPUT_TOKENS) || 300;
const TRUTH_MAX_TOKENS = Number(process.env.ASK_TRUTH_MAX_TOKENS) || 260;
const EMAIL = "info@studio-veritas.com";

// Every non-answer is a static, in-voice message. No model call, no cost.
const CANNED = {
  closed: `Ask Veritas is resting. Write to ${EMAIL} and a person will answer.`,
  busy: `Ask Veritas has reached its limit for today. The honest option: ${EMAIL}.`,
  slow: "A lot of questions at once. Give it a few minutes, or email info@studio-veritas.com.",
  you: "You have asked a lot today. For the longer conversation, write to info@studio-veritas.com.",
  decline: "I only answer questions about Studio Veritas. Ask me about the work, the approach or how to work together.",
  declineTruth: "VERDICT: That's not a brand claim. Paste a tagline, a promise or a line your brand uses.",
  bad: "I couldn't read that. Try a shorter question.",
  error: `Something broke on our side. Email ${EMAIL} and we'll pick it up.`,
} as const;

const json = (status: number, reply: string, code?: string) =>
  Response.json({ reply, code }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (process.env.ASK_VERITAS_ENABLED === "false") return json(503, CANNED.closed, "disabled");
  if (!process.env.ANTHROPIC_API_KEY) return json(503, CANNED.error, "config");

  const allowed = (process.env.ASK_ALLOWED_ORIGINS || "studio-veritas.com").split(",");
  const dev = process.env.NODE_ENV !== "production";
  if (!isAllowedOrigin(req.headers.get("origin"), allowed, dev)) return json(403, CANNED.error, "origin");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, CANNED.bad, "bad");
  }
  const mode = parseMode(body);
  let messages = validateMessages(body);
  if (!mode || !messages) return json(400, CANNED.bad, "bad");
  // The Truth Test judges one claim with no history: cheaper, and nothing earlier can steer the verdict.
  if (mode === "truth") messages = [messages[messages.length - 1]];

  const last = messages[messages.length - 1].content;
  if (looksLikeInjection(last)) return json(200, mode === "truth" ? CANNED.declineTruth : CANNED.decline, "screened");

  try {
    const salt = process.env.ASK_HASH_SALT || "ask-veritas";
    const visitor = hashVisitor(clientIp(req.headers), req.headers.get("user-agent"), salt);
    const verdict = await checkLimits(getStore(process.env), visitor, readLimits(process.env));
    if (!verdict.ok) {
      const map = { burst: CANNED.slow, ip_day: CANNED.you, global_day: CANNED.busy } as const;
      return json(429, map[verdict.code], verdict.code);
    }
  } catch {
    // If the limiter store is down, fail closed: no model call without a working cap.
    return json(503, CANNED.error, "limiter");
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 20_000, maxRetries: 1 });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: mode === "truth" ? TRUTH_MAX_TOKENS : MAX_OUTPUT_TOKENS,
      system: mode === "truth" ? TRUTH_PROMPT : SYSTEM_PROMPT,
      messages,
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return json(200, text || CANNED.error);
  } catch {
    return json(502, CANNED.error, "upstream"); // never leak provider errors or keys
  }
}

export function GET() {
  return new Response("Method not allowed", { status: 405 });
}
