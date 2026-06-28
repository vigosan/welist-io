// Leading list markers to strip: "1." "1)" "1 -" / "-" "*" "•" "–" "—"
const NUMBERED = /^\s*\d+\s*[.)\]-]\s+/;
const BULLET = /^\s*[-*•–—]\s+/;

function stripMarker(line: string): string {
  if (NUMBERED.test(line)) return line.replace(NUMBERED, "");
  if (BULLET.test(line)) return line.replace(BULLET, "");
  return line;
}

/**
 * Parses pasted text into a deduped list of item texts.
 * - Multiple lines: one item per non-empty line.
 * - A single line with commas/semicolons (and no newlines): split on them.
 * - Strips leading list markers (1. / 2) / - / * / •).
 * - Trims and removes case-insensitive duplicates, preserving first occurrence.
 */
export function parseBulkText(raw: string): string[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  let parts: string[];
  if (lines.length <= 1) {
    const single = lines[0] ?? "";
    parts = /[,;]/.test(single) ? single.split(/[,;]/) : [single];
  } else {
    parts = lines;
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const text = stripMarker(part).trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}
