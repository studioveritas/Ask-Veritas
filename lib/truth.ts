// Truth Test: parsing the model's structured verdict. Client-safe (no prompt text in here).

export type Rating = "STRONG" | "MIXED" | "WEAK";
export type Mark = { name: "Truthful" | "Noticeable" | "Memorable"; rating: Rating; note: string };
export type Verdict = { verdict: string; marks: Mark[]; sharper?: string };

const ORDER: Mark["name"][] = ["Truthful", "Noticeable", "Memorable"];
const strip = (s: string) => s.replace(/^[\s*_#>-]+/, "").replace(/[*_]+/g, "").trim();

/** Returns null when there is no VERDICT line, so the UI can fall back to plain text. */
export function parseVerdict(text: string): Verdict | null {
  let verdict = "";
  let sharper: string | undefined;
  const marks = new Map<Mark["name"], Mark>();

  for (const raw of text.split(/\r?\n/)) {
    const line = strip(raw);
    if (!line) continue;

    let m = line.match(/^VERDICT\s*:\s*(.+)$/i);
    if (m) {
      if (!verdict) verdict = m[1].trim();
      continue;
    }
    m = line.match(/^(TRUTHFUL|NOTICEABLE|MEMORABLE)\s*:\s*(STRONG|MIXED|WEAK)\b[\s.:,;|–—-]*(.*)$/i);
    if (m) {
      const name = (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) as Mark["name"];
      if (!marks.has(name)) marks.set(name, { name, rating: m[2].toUpperCase() as Rating, note: m[3].trim() });
      continue;
    }
    m = line.match(/^SHARPER\s*:\s*(.+)$/i);
    if (m && !sharper) sharper = m[1].trim();
  }

  if (!verdict) return null;
  return {
    verdict,
    marks: ORDER.filter((n) => marks.has(n)).map((n) => marks.get(n)!),
    ...(sharper ? { sharper } : {}),
  };
}
