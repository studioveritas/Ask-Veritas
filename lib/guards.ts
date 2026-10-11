import { createHash } from "node:crypto";

export const MAX_CHARS = 400; // per visitor message
export const MAX_ASSISTANT_CHARS = 700; // per prior reply echoed back
export const MAX_TURNS = 6; // messages of history sent to the model

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ServerMode = "ask" | "truth";

/** "ask" when absent (backwards compatible), "truth" for the Truth Test, null for anything else. */
export function parseMode(body: unknown): ServerMode | null {
  const m = (body as { mode?: unknown })?.mode;
  if (m === undefined || m === "ask") return "ask";
  if (m === "truth") return "truth";
  return null;
}

/** Validate and trim client-supplied history. Returns null if unusable. */
export function validateMessages(body: unknown): ChatMessage[] | null {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 40) return null;

  const clean: ChatMessage[] = [];
  for (const m of raw) {
    const role = (m as ChatMessage)?.role;
    const content = (m as ChatMessage)?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.replace(/\s+/g, " ").trim();
    if (!text) return null;
    const cap = role === "user" ? MAX_CHARS : MAX_ASSISTANT_CHARS;
    if (role === "user" && text.length > MAX_CHARS) return null;
    clean.push({ role, content: text.slice(0, cap) });
  }

  let tail = clean.slice(-MAX_TURNS);
  while (tail.length && tail[0].role !== "user") tail = tail.slice(1); // API needs a user turn first
  if (!tail.length || tail[tail.length - 1].role !== "user") return null;

  // collapse consecutive same-role turns (forged or duplicated history)
  const merged: ChatMessage[] = [];
  for (const m of tail) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content = m.content;
    else merged.push({ ...m });
  }
  return merged;
}

const INJECTION = [
  /ignore (all |any |your |the )?(previous|prior|above|earlier) (instructions|rules|prompt)/i,
  /disregard (all |any |your |the )?(previous|prior|above|earlier|system)/i,
  /(reveal|show|print|repeat|output) (me )?(your |the )?(system )?(prompt|instructions)/i,
  /\byou are now\b/i,
  /\b(jailbreak|DAN mode|developer mode)\b/i,
];

/** Cheap pre-screen: obvious injection attempts get a canned reply and cost nothing. */
export function looksLikeInjection(text: string): boolean {
  return INJECTION.some((r) => r.test(text));
}

/** Only accept requests whose Origin host is on the allow-list (browsers always send Origin on POST). */
export function isAllowedOrigin(
  origin: string | null,
  allowed: string[],
  allowLocalhost: boolean
): boolean {
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (allowLocalhost && (host === "localhost" || host === "127.0.0.1")) return true;
  return allowed.some((a) => {
    const h = a.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return h && (host === h || host === `www.${h}` || `www.${host}` === h);
  });
}

export function clientIp(h: Headers): string {
  const xff = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || h.get("x-real-ip")?.trim() || "unknown";
}

/** Counters key on a salted hash, so raw IPs are never stored. */
export function hashVisitor(ip: string, ua: string | null, salt: string): string {
  return createHash("sha256").update(`${salt}|${ip}|${(ua ?? "").slice(0, 80)}`).digest("hex").slice(0, 24);
}
