// Every surface that shows AI output carries the AiLabel (konzept.md 7.8,
// F14): a source file that renders AI-derived fields or calls the AI wish
// translation must also render <AiLabel>. Runtime checks of
// data-ai-provenance run in the walkthroughs (suchrahmen, warnungen,
// pflichtseiten).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = resolve(import.meta.dirname, '../src');
const AI_MARKERS = [/\bai_assisted\b/, /\bai_provenance\b/, /\bparseWish\(/, /\bai_labels\./];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? files(path) : path.endsWith('.tsx') ? [path] : [];
  });
}

describe('AI labels on every AI surface', () => {
  it('finds the known AI surfaces', () => {
    const surfaces = files(src).filter((f) => AI_MARKERS.some((m) => m.test(readFileSync(f, 'utf8'))));
    expect(surfaces.map((f) => relative(src, f)).sort()).toEqual(
      expect.arrayContaining([
        'features/results/ResultList.tsx',
        'features/results/ReviewCheckPanel.tsx',
        'features/search/StepFrame.tsx',
        'features/search/StepPlaces.tsx',
        'features/search/StepRegions.tsx',
      ]),
    );
  });

  it('renders <AiLabel> wherever AI output is shown', () => {
    const missing = files(src)
      .filter((f) => AI_MARKERS.some((m) => m.test(readFileSync(f, 'utf8'))))
      // Pass-through of the label text without rendering AI output.
      .filter((f) => !/\bAiLabel\b/.test(readFileSync(f, 'utf8')))
      .filter((f) => !/ai_labels\.review_analysis \?\? ''\)/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(src, f));
    expect(missing).toEqual([]);
  });
});
