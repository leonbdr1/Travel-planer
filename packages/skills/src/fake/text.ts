// Helpers of the deterministic fake models: they read the rendered prompt
// exactly as a real model would (tags around the data) and never see the
// structured input.

/** Lowercase, umlauts folded (ä→a, ß→ss), look-alike brackets reverted. */
export function fold(text: string): string {
  return text
    .replaceAll('‹', '<')
    .replaceAll('›', '>')
    .toLowerCase()
    .replaceAll('ß', 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function extractTag(prompt: string, tag: string): string {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(prompt);
  return (m?.[1] ?? '').trim();
}

/** Reverts the renderer's tag neutralisation for display purposes. */
export function unneutralize(text: string): string {
  return text.replaceAll('‹', '<').replaceAll('›', '>');
}

/** Optimal string alignment distance (Damerau-Levenshtein without repeated edits). */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) (d[0] as number[])[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const row = d[i] as number[];
      const prev = d[i - 1] as number[];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min((prev[j] as number) + 1, (row[j - 1] as number) + 1, (prev[j - 1] as number) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j] as number, ((d[i - 2] as number[])[j - 2] as number) + 1);
      }
    }
  }
  return (d[a.length] as number[])[b.length] as number;
}
