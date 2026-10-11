import test from "node:test";
import assert from "node:assert/strict";
import { parseVerdict } from "../lib/truth";
import { PROCESS, processKnowledge, processReady, type Stage } from "../lib/process";
import { buildPrompts, SYSTEM_PROMPT, TRUTH_PROMPT } from "../lib/prompt";
import { parseMode } from "../lib/guards";

const GOOD = `VERDICT: Honest, but it could belong to anyone.
TRUTHFUL: MIXED. Plausible, but nothing in it is specific to you.
NOTICEABLE: WEAK. Every brand in the category says this.
MEMORABLE: STRONG. The rhythm sticks.
SHARPER: What do you refuse to do that your competitors happily do?`;

test("parseVerdict reads the five-line format", () => {
  const v = parseVerdict(GOOD)!;
  assert.equal(v.verdict, "Honest, but it could belong to anyone.");
  assert.deepEqual(v.marks.map((m) => [m.name, m.rating]), [
    ["Truthful", "MIXED"],
    ["Noticeable", "WEAK"],
    ["Memorable", "STRONG"],
  ]);
  assert.equal(v.marks[0].note, "Plausible, but nothing in it is specific to you.");
  assert.match(v.sharper!, /refuse/);
});

test("parseVerdict tolerates markdown, dashes, case and order", () => {
  const v = parseVerdict(
    `**Verdict:** Clear.\n- memorable: weak — forgettable\n* Truthful: Strong | true\nnoticeable: mixed: fine\n`
  )!;
  assert.equal(v.verdict, "Clear.");
  assert.deepEqual(v.marks.map((m) => m.name), ["Truthful", "Noticeable", "Memorable"]); // canonical order
  assert.equal(v.marks[2].note, "forgettable");
  assert.equal(v.sharper, undefined);
});

test("parseVerdict: refusal line parses; prose and limits fall back to null", () => {
  const r = parseVerdict("VERDICT: That's not a brand claim. Paste a tagline.")!;
  assert.equal(r.marks.length, 0);
  assert.equal(parseVerdict("Ask Veritas has reached its limit for today."), null);
  assert.equal(parseVerdict(""), null);
});

test("parseVerdict ignores invalid ratings and duplicates", () => {
  const v = parseVerdict("VERDICT: x\nTRUTHFUL: AMAZING. no\nTRUTHFUL: WEAK. yes\nTRUTHFUL: STRONG. dup")!;
  assert.deepEqual(v.marks, [{ name: "Truthful", rating: "WEAK", note: "yes" }]);
});

test("parseMode", () => {
  assert.equal(parseMode({}), "ask");
  assert.equal(parseMode({ mode: "ask" }), "ask");
  assert.equal(parseMode({ mode: "truth" }), "truth");
  assert.equal(parseMode({ mode: "process" }), null); // process guide never calls the API
  assert.equal(parseMode({ mode: 1 }), null);
});

const filled: Stage[] = PROCESS.map((s) => ({ ...s, copy: `${s.name} real copy goes here.` }));

test("process guide stays hidden until all three stages have copy", () => {
  assert.equal(processReady(), false); // shipped state: copy not written yet
  assert.equal(processReady(filled), true);
  assert.equal(processReady(filled.map((s, i) => (i === 1 ? { ...s, copy: "  " } : s))), false);
});

test("bot knowledge follows the process copy", () => {
  assert.match(processKnowledge(), /do not invent/);
  assert.doesNotMatch(processKnowledge(), /real copy goes here/);
  const k = processKnowledge(filled);
  assert.match(k, /Noticeable real copy goes here/);
  assert.doesNotMatch(k, /do not invent what each stage/);
});

test("prompts: truth mode adds format + lenses; copy flows in once written", () => {
  assert.ok(TRUTH_PROMPT.startsWith(SYSTEM_PROMPT));
  assert.match(TRUTH_PROMPT, /TRUTH TEST MODE/);
  assert.match(TRUTH_PROMPT, /SHARPER:/);
  for (const s of PROCESS) assert.ok(TRUTH_PROMPT.includes(s.lens));
  assert.doesNotMatch(SYSTEM_PROMPT, /TRUTH TEST MODE/);
  assert.doesNotMatch(TRUTH_PROMPT, /Studio copy for this stage/);
  assert.match(buildPrompts(filled).truth, /Studio copy for this stage: Memorable real copy/);
});

test("prompt never carries the personal phone number or gmail", () => {
  for (const p of [SYSTEM_PROMPT, TRUTH_PROMPT]) {
    assert.doesNotMatch(p, /46 80 80 59|gfurminger@gmail/i);
  }
});
