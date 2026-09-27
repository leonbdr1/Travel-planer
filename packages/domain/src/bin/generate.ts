// Compiles domain data from YAML into committed TypeScript modules, so the
// pure domain package never reads files at runtime (Worker, browser). CI
// verifies the tree is unchanged after `npm run gen`.
//
// - src/review-lexicon.yaml → src/generated/review-lexicon.ts (S7.1)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { z } from 'zod';
import { REVIEW_TOPICS } from '../vocabulary';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '..');

const LANGUAGES = ['de', 'en', 'fr', 'it', 'nl'] as const;
const keyword = z
  .string()
  .min(2)
  .max(60)
  .regex(/^\*?[\p{L}\p{N}' -]+\*?$/u, 'letters, digits, apostrophes, hyphens and spaces; `*` only at the start or end')
  .refine((k) => k === k.toLocaleLowerCase('de'), 'keywords are lowercase');
const perLanguage = z.strictObject(Object.fromEntries(LANGUAGES.map((l) => [l, z.array(keyword).min(1)])) as Record<(typeof LANGUAGES)[number], z.ZodArray<typeof keyword>>);
const lexiconSchema = z.strictObject({
  version: z.literal(1),
  topics: z.strictObject(Object.fromEntries(REVIEW_TOPICS.map((t) => [t, perLanguage])) as Record<(typeof REVIEW_TOPICS)[number], typeof perLanguage>),
  negations: z.strictObject(
    Object.fromEntries(LANGUAGES.map((l) => [l, z.array(z.string().min(1).max(20).regex(/^[\p{L}']+$/u))])) as Record<(typeof LANGUAGES)[number], z.ZodArray<z.ZodString>>,
  ),
});

function writeIfChanged(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return true;
}

function renderLexicon(): string {
  const raw = parse(readFileSync(resolve(src, 'review-lexicon.yaml'), 'utf8')) as unknown;
  const parsed = lexiconSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`review-lexicon.yaml: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  for (const topic of REVIEW_TOPICS) {
    for (const lang of LANGUAGES) {
      const list = parsed.data.topics[topic][lang];
      if (new Set(list).size !== list.length) throw new Error(`review-lexicon.yaml: duplicate keyword in ${topic}.${lang}`);
    }
  }
  return [
    '// Generated from src/review-lexicon.yaml by src/bin/generate.ts (`npm run gen`). Do not edit.',
    "import type { ReviewTopic } from '../vocabulary';",
    '',
    `export const REVIEW_LEXICON_LANGUAGES = ${JSON.stringify(LANGUAGES)} as const;`,
    'export type LexiconLanguage = (typeof REVIEW_LEXICON_LANGUAGES)[number];',
    '',
    'export interface ReviewLexicon {',
    '  version: number;',
    '  topics: Record<ReviewTopic, Record<LexiconLanguage, readonly string[]>>;',
    '  negations: Record<LexiconLanguage, readonly string[]>;',
    '}',
    '',
    `export const REVIEW_LEXICON: ReviewLexicon = ${JSON.stringify(parsed.data, null, 2)};`,
    '',
  ].join('\n');
}

function main(): void {
  const changed = writeIfChanged(resolve(src, 'generated/review-lexicon.ts'), renderLexicon());
  if (!process.argv.includes('--quiet') || changed) console.log(`domain: ${changed ? 'generated' : 'up to date'} (review lexicon)`);
}

main();
