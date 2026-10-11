// The Studio Veritas process: single source of truth.
// Fill each `copy` with the real copy when it's written. Until ALL THREE are filled:
//   - the Process guide stays hidden (no tab, no footer link)
//   - the bot knows only the three names and won't invent detail
// Once filled, the guide appears automatically, the bot can explain each stage, and the
// Truth Test uses the copy alongside the lens. Point the Process page pop-outs at this file
// too, so the site and the bot never drift apart.
//
// `lens` is a working one-line test question the Truth Test uses to judge a claim.
// These lenses are DRAFTS written for the bot, not studio copy. Rewrite them in your words.

export type StageKey = "truthful" | "noticeable" | "memorable";

export type Stage = {
  key: StageKey;
  name: string;
  copy: string | null;
  lens: string;
};

export const PROCESS: Stage[] = [
  {
    key: "truthful",
    name: "Truthful",
    copy: null,
    lens: "Is it true and specific to this brand, or a generic category claim anyone could make?",
  },
  {
    key: "noticeable",
    name: "Noticeable",
    copy: null,
    lens: "Would it stand out in its category and in culture, or blend into what everyone else says?",
  },
  {
    key: "memorable",
    name: "Memorable",
    copy: null,
    lens: "Would someone repeat it tomorrow? Is there a tension, image or turn of phrase that sticks?",
  },
];

export function processReady(stages: Stage[] = PROCESS): boolean {
  return stages.length > 0 && stages.every((s) => typeof s.copy === "string" && s.copy.trim().length > 0);
}

/** The process section of the bot's knowledge, depending on whether the real copy exists. */
export function processKnowledge(stages: Stage[] = PROCESS): string {
  const names = stages.map((s) => s.name).join(" / ");
  if (!processReady(stages)) {
    return `## Process\nThe studio's process has three stages: ${names}. The detailed copy for these stages is still being written. Name them if asked, but do not invent what each stage involves; point to info@studio-veritas.com for more.`;
  }
  const body = stages.map((s) => `### ${s.name}\n${s.copy!.trim()}`).join("\n\n");
  return `## Process\nThe studio's process has three stages: ${names}. Explain them using this copy, in your own short words, without adding claims it doesn't make.\n\n${body}`;
}
