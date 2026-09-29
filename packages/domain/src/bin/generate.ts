// Compiles domain data from YAML into committed TypeScript modules, so the
// pure domain package never reads files at runtime (Worker, browser). CI
// verifies the tree is unchanged after `npm run gen`.
//
// - src/review-lexicon.yaml → src/generated/review-lexicon.ts (S7.1)
// - src/praise-lexicon.yaml → src/generated/praise-lexicon.ts (S11.2)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { z } from 'zod';
import { PRAISE_TOPICS, REVIEW_TOPICS } from '../vocabulary';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '..');

// Since F18 also the languages of the European destinations (reviews from local guests).
const LANGUAGES = ['de', 'en', 'fr', 'it', 'nl', 'es', 'pt', 'pl', 'cs', 'hr', 'hu', 'da', 'sv', 'no', 'el'] as const;
type Language = (typeof LANGUAGES)[number];
const keyword = z
  .string()
  .min(2)
  .max(60)
  .regex(/^\*?[\p{L}\p{N}' -]+\*?$/u, 'letters, digits, apostrophes, hyphens and spaces; `*` only at the start or end')
  .refine((k) => k === k.toLocaleLowerCase('de'), 'keywords are lowercase');
const perLanguage = z.strictObject(Object.fromEntries(LANGUAGES.map((l) => [l, z.array(keyword).min(1)])) as Record<Language, z.ZodArray<typeof keyword>>);
const wordList = z.strictObject(
  Object.fromEntries(LANGUAGES.map((l) => [l, z.array(z.string().min(1).max(20).regex(/^[\p{L}']+$/u))])) as Record<Language, z.ZodArray<z.ZodString>>,
);
const topicsOf = <T extends string>(topics: readonly T[]) => z.strictObject(Object.fromEntries(topics.map((t) => [t, perLanguage])) as Record<T, typeof perLanguage>);

const lexiconSchema = z.strictObject({ version: z.literal(1), topics: topicsOf(REVIEW_TOPICS), negations: wordList });
const praiseLexiconSchema = z.strictObject({ version: z.literal(1), topics: topicsOf(PRAISE_TOPICS), nothing: wordList });

function writeIfChanged(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return true;
}

function load<T extends { topics: Record<string, Record<Language, string[]>> }>(file: string, schema: z.ZodType<T>): T {
  const raw = parse(readFileSync(resolve(src, file), 'utf8')) as unknown;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${file}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  for (const [topic, lists] of Object.entries(parsed.data.topics)) {
    for (const lang of LANGUAGES) {
      const list = lists[lang];
      if (new Set(list).size !== list.length) throw new Error(`${file}: duplicate keyword in ${topic}.${lang}`);
    }
  }
  return parsed.data;
}

function renderLexicon(): string {
  const data = load('review-lexicon.yaml', lexiconSchema);
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
    `export const REVIEW_LEXICON: ReviewLexicon = ${JSON.stringify(data, null, 2)};`,
    '',
  ].join('\n');
}

function renderPraiseLexicon(): string {
  const data = load('praise-lexicon.yaml', praiseLexiconSchema);
  return [
    '// Generated from src/praise-lexicon.yaml by src/bin/generate.ts (`npm run gen`). Do not edit.',
    "import type { PraiseTopic } from '../vocabulary';",
    "import type { LexiconLanguage } from './review-lexicon';",
    '',
    'export interface PraiseLexicon {',
    '  version: number;',
    '  topics: Record<PraiseTopic, Record<LexiconLanguage, readonly string[]>>;',
    '  nothing: Record<LexiconLanguage, readonly string[]>;',
    '}',
    '',
    `export const PRAISE_LEXICON: PraiseLexicon = ${JSON.stringify(data, null, 2)};`,
    '',
  ].join('\n');
}

function main(): void {
  const outputs: Array<[string, string, () => string]> = [
    ['review lexicon', 'generated/review-lexicon.ts', renderLexicon],
    ['praise lexicon', 'generated/praise-lexicon.ts', renderPraiseLexicon],
  ];
  for (const [label, file, render] of outputs) {
    const changed = writeIfChanged(resolve(src, file), render());
    if (!process.argv.includes('--quiet') || changed) console.log(`domain: ${changed ? 'generated' : 'up to date'} (${label})`);
  }
}

main();
