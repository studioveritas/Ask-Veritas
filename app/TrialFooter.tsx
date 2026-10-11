"use client";
// TRIAL ONLY: mimics the site's slide-up footer (#e3e3e3, black contact box) and bottom-right triangle.
import { useState } from "react";
import AskVeritasFooterEntry from "@/components/AskVeritasFooterEntry";

const mono = '"IBM Plex Mono", ui-monospace, monospace';

export default function TrialFooter() {
  const [up, setUp] = useState(false);
  return (
    <>
      <footer
        aria-hidden={!up}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          background: "#e3e3e3",
          color: "#000",
          fontFamily: mono,
          padding: "24px 16px calc(80px + env(safe-area-inset-bottom, 0px))",
          transform: up ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(.2,.8,.2,1)",
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          justifyContent: "center",
          textAlign: "left",
        }}
      >
        <div style={{ background: "#000", color: "#fff", borderRadius: 14, padding: 16, minWidth: 200 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, letterSpacing: "0.1em" }}>CONTACT</p>
          <a href="mailto:info@studio-veritas.com" style={{ color: "#fff", fontSize: 13 }}>
            info@studio-veritas.com
          </a>
        </div>
        <AskVeritasFooterEntry />
      </footer>
      <button
        type="button"
        aria-label={up ? "Close footer" : "Open footer"}
        aria-expanded={up}
        onClick={() => setUp((v) => !v)}
        style={{
          position: "fixed",
          right: "calc(16px + env(safe-area-inset-right, 0px))",
          bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          zIndex: 60,
          width: 48,
          height: 48,
          border: 0,
          background: "transparent",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <svg viewBox="0 0 20 20" width="30" height="30" aria-hidden="true">
          <path d="M10 3 L18 17 H2 Z" fill={up ? "#000" : "#fff"} style={{ transition: "fill .3s" }} />
        </svg>
      </button>
    </>
  );
}
