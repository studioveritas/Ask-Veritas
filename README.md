# Ask Veritas

A pop-out chat for the Studio Veritas site, opened from the footer triangle. It does three things:

1. **Ask:** "Ask us anything. Even a random thought." Answers only from the site copy and the credentials deck.
2. **The Truth Test:** a visitor pastes a brand line and gets a candid verdict: Truthful, Noticeable and Memorable each rated STRONG / MIXED / WEAK, plus a sharper version. Each line types in turn.
3. **Process guide:** walks through Truthful / Noticeable / Memorable using your real copy. It stays hidden until that copy is written (see below). Browsing it is free; it runs locally with no AI call.

It runs on Claude Haiku 5.5 and is capped so spend cannot run away.

## Files

| File | Job |
|---|---|
| `components/AskVeritas.tsx` + `ask-veritas.css` | The panel: black module, spring entrance, typewriter reveal, three modes, AI disclosure |
| `components/AskVeritasFooterEntry.tsx` | Black box for the slide-up footer: "Ask us anything", "Take the Truth Test", "How we work" (when ready) |
| `components/open.ts` | `openAskVeritas(mode)`: open the panel from any button |
| `app/api/ask/route.ts` | The only server endpoint. Holds the API key; every guardrail runs before any model call |
| `lib/process.ts` | **Truthful / Noticeable / Memorable: the one place to put the real copy** |
| `lib/knowledge.ts` | What the bot knows (site + credentials) |
| `lib/prompt.ts` | Voice, rules, and the Truth Test format |
| `lib/truth.ts` | Reads the verdict into the card |
| `lib/limits.ts`, `lib/guards.ts` | Caps, origin check, input validation, injection pre-screen |
| `test/` | 18 tests |

No database, no Prisma, no `/api/contact`. Conversations are not stored.

## Install

1. **Cap the spend first.** In the Anthropic Console, create an API key just for this site and set a monthly spend limit on it. Check the Console and docs.claude.com for where limits live and for Haiku 5.5 pricing. This cap is your real backstop.
2. `npm i @anthropic-ai/sdk` (framer-motion is already in the site).
3. **Copy** `app/api/ask/`, `components/` (the four Ask Veritas files) and `lib/` into the site. Imports use `@/lib/...`; if the site has no `@/*` alias, make them relative.
4. **Mount the panel once, in the root layout**, next to the footer, so the footer entry works on every page:
   ```tsx
   import AskVeritas from "@/components/AskVeritas";
   // ...inside <body>, after the footer:
   <AskVeritas />
   ```
   Nothing calls the AI until a visitor asks, so mounting site-wide costs nothing.
5. **Put the entry in the footer panel** (the one the bottom-right triangle slides up), next to the black contact box:
   ```tsx
   import AskVeritasFooterEntry from "@/components/AskVeritasFooterEntry";
   <AskVeritasFooterEntry />
   ```
   Prefer the triangle itself to open the chat? Call `openAskVeritas("ask")` from its onClick instead. Any button can open a specific mode, e.g. `openAskVeritas("truth")` on a "Test your brand line" CTA.
6. **Environment variables** (Vercel):
   - `ANTHROPIC_API_KEY` (required)
   - `ASK_ALLOWED_ORIGINS=studio-veritas.com`
   - `ASK_HASH_SALT=<any long random string>`
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (strongly recommended, see "Honest limits")
7. Update the privacy policy (below), deploy to a preview, and run the checks at the bottom.

## Trying it on its own (before it goes into the site)

`app/layout.tsx`, `app/page.tsx` and `app/TrialFooter.tsx` are a **trial shell**: a stand-in home page with the footer triangle, marked "Trial build". With them in the repo, the `ask-veritas` Vercel project serves a working page. **Don't copy these three files into the real site.**

Trial settings in Vercel (Project → Settings → Environment Variables):

- `ANTHROPIC_API_KEY`: the key you made for this, with a spend limit set in the Anthropic Console. Mark it Sensitive. Never commit it; the repo is public.
- `ASK_ALLOWED_ORIGINS=ask-veritas.vercel.app,ask-veritas-gfurminger-1137.vercel.app`. **Without this every question gets "Something broke"**, because by default only studio-veritas.com is allowed.
- `ASK_GLOBAL_DAY_MAX=30`: a low cap while trialling.
- `ASK_HASH_SALT=<any long random string>`

Redeploy after adding them. Vercel Authentication is on for the project, so the `.vercel.app` URLs only open for people signed in to your Vercel account or team. Upstash isn't needed for a small trial.

## Turning on the Process guide

In `lib/process.ts`, replace each `copy: null` with the real copy for that stage. When **all three** are filled:

- the Process tab and the footer's "How we work" line appear,
- Ask can explain each stage (it's told not to add claims the copy doesn't make),
- the Truth Test judges lines with your copy as well as the lens.

Until then the bot knows only the three names and won't invent what they mean. Point the Process page pop-outs at the same file so the site and the bot never drift apart.

The `lens` on each stage is a one-line test question the Truth Test uses. **These are my drafts, not studio copy.** Rewrite them in your words.

## The Truth Test

- Judges the **words only**. It's told not to state facts about real companies or people, not to judge legal compliance, and never to imply Studio Veritas worked on the brand.
- One claim, no history: cheaper, and earlier messages can't steer the verdict.
- Non-claims (questions, gibberish, attacks on a person) get a one-line "That's not a brand claim" reply. So do obvious injection attempts, and those cost nothing.
- If the reply doesn't come back in the expected format, the panel shows it as plain text rather than a broken card.
- Every verdict ends: "A verdict is a start, not a strategy," with the email.

## Cost controls (all env-configurable)

| Control | Default | Env var |
|---|---|---|
| Burst: questions per visitor per window | 5 per 10 min | `ASK_BURST_MAX`, `ASK_BURST_WINDOW_SEC` |
| Per visitor per day (UTC) | 15 | `ASK_IP_DAY_MAX` |
| **Global per day, all visitors** | **150** | `ASK_GLOBAL_DAY_MAX` |
| Max output per Ask reply | 300 tokens | `ASK_MAX_OUTPUT_TOKENS` |
| Max output per Truth Test verdict | 260 tokens | `ASK_TRUTH_MAX_TOKENS` |
| Message / claim length | 400 chars | (in `lib/guards.ts`) |
| History sent to model (Ask) | last 6 turns | (in `lib/guards.ts`) |
| Per page visit (Ask + Truth Test combined) | 10 | `SESSION_CAP` in the component |
| Kill switch | on | `ASK_VERITAS_ENABLED=false` |
| Model | `claude-haiku-5-5` | `ASK_VERITAS_MODEL` |

Ask and the Truth Test share all caps. The Process guide, mode switches, the disclosure and all limit/error messages are free.

**Worst-case daily spend.** The Ask prompt is about 2.7k tokens and the Truth Test prompt about 3.2k (characters / 4). At 150 calls a day that's roughly 570k input and 45k output tokens at most. Multiply by the current Haiku 5.5 prices to get your ceiling, then tune `ASK_GLOBAL_DAY_MAX`. Start low and raise it once you've seen real traffic.

## Honest limits

- **Without Upstash, caps are per server instance.** On Vercel's serverless platform the in-memory fallback doesn't share counts, so it's fine for local dev but not a guarantee in production. Upstash's free tier is enough. If Upstash is configured but unreachable, the route fails closed (no model call).
- **"Only people on the website" is a deterrent, not authentication.** The Origin check stops other websites and casual use; a determined script can fake it. The caps and the Console spend limit bound the cost. If abuse shows up, add Vercel BotID or WAF rate limiting on `/api/ask`.
- The injection pre-screen is a speed bump. The prompt does the real work, and the bot has no tools and nothing to leak beyond public text.

## Legal and privacy (not legal advice)

- **EU AI Act, Art. 50:** visitors must be told they're talking to AI at first interaction. Ask opens with a disclosure line, the Truth Test intro says "Veritas, an AI", and the panel is labelled "AI", all before any API call.
- **Privacy page:** say that questions and brand lines are processed by an AI provider (Anthropic), for what purpose, and that the site doesn't store conversations. Check what your hosting and provider retain, and have someone qualified review the wording.

## Review before launch

- **Bios:** the designs show near-identical bios for Guillaume and Ali, and Guillaume's reads "Born and raised in the UK, Oregon". Fix in `lib/knowledge.ts`.
- **Truth Test lenses** in `lib/process.ts` are drafts. Rewrite them.
- **Credentials from earlier roles** (ASICS JYUNI at Green Room Design, adidas Brand Design) are framed as "selected brand experience". Confirm that's right.
- **Excluded on purpose:** the personal phone number and Gmail from the deck. The bot only gives `info@studio-veritas.com`.

## Design notes

- The panel opens bottom-right, above the triangle, over the footer (z-index 90). Raise it in the CSS if the footer sits higher.
- Focus moves to the input on open and returns to the button that opened it on close or Escape.
- The panel restores the system cursor inside itself (the site uses a custom SVG cursor).
- Fonts use `var(--font-plex-mono, "IBM Plex Mono")`. Rename at the top of `ask-veritas.css` if the site's variable differs.
- Typewriter: click any line while it types to finish it. Skipped for `prefers-reduced-motion`.
- `<AskVeritas showTrigger />` adds a floating pill, for pages without the footer.

## Checks after deploy

```bash
U=https://studio-veritas.com/api/ask
curl -s -o /dev/null -w '%{http_code}\n' -X POST $U -H 'Content-Type: application/json' -d '{"mode":"truth","messages":[{"role":"user","content":"x"}]}'   # 403: no Origin
curl -s $U -o /dev/null -w '%{http_code}\n'                                                                                                                # 405
```

Then on the live site: open the footer, take the Truth Test with a real line, ask a real question, and check the disclosure and (after your burst limit) the in-voice limit message. Locally: `npm test` and `npm run typecheck`.
