"use client";

// Drop this inside the slide-up footer panel (the one the bottom-right triangle opens).
// It's a black box like the footer's contact box. Each line opens Ask Veritas in a mode.
// The Process line appears only once the real process copy exists in lib/process.ts.

import { processReady } from "@/lib/process";
import { openAskVeritas } from "./open";
import "./ask-veritas.css";

export default function AskVeritasFooterEntry({ className = "" }: { className?: string }) {
  return (
    <div className={`av-entry ${className}`.trim()}>
      <p className="av-entry-title">
        Ask Veritas <span className="av-badge">AI</span>
      </p>
      <button type="button" className="av-entry-link" onClick={() => openAskVeritas("ask")}>
        Ask us anything <span aria-hidden="true">→</span>
      </button>
      <button type="button" className="av-entry-link" onClick={() => openAskVeritas("truth")}>
        Take the Truth Test <span aria-hidden="true">→</span>
      </button>
      {processReady() && (
        <button type="button" className="av-entry-link" onClick={() => openAskVeritas("process")}>
          How we work <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
