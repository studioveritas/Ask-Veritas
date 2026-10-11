// TRIAL ONLY: a stand-in for the Studio Veritas home page, with the footer triangle.
import TrialFooter from "./TrialFooter";

const mono = '"IBM Plex Mono", ui-monospace, monospace';

export default function TrialPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "24px 16px 120px",
        fontFamily: mono,
        textAlign: "center",
        background: "radial-gradient(ellipse at 50% 40%, #1c1c5e 0%, #0f0f3d 60%)",
      }}
    >
      <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.2em", color: "#5683dd" }}>TRIAL BUILD · NOT THE LIVE SITE</p>
      <h1 style={{ margin: 0, fontWeight: 500, fontSize: "clamp(28px, 7vw, 56px)", letterSpacing: "0.06em" }}>
        STUDIO VERITAS
      </h1>
      <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Growth in truth.</p>
      <p style={{ margin: "28px 0 0", maxWidth: 360, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
        Tap the triangle, bottom right, to open the footer. Ask Veritas lives there.
      </p>
      <TrialFooter />
    </main>
  );
}
