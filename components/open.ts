// Open Ask Veritas from anywhere: the footer triangle panel, a nav link, a CTA.
//   import { openAskVeritas } from "@/components/open";
//   <button onClick={() => openAskVeritas("truth")}>Take the Truth Test</button>

export type AskMode = "ask" | "truth" | "process";
export const OPEN_EVENT = "ask-veritas:open";

export function openAskVeritas(mode: AskMode = "ask"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { mode } }));
}
