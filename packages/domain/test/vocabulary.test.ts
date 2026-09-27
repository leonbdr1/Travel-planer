import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { CHIPS } from '../src/chips';
import { CHIP_CODES, REVIEW_TOPICS, REVIEW_TOPIC_LABELS, THEME_CODES } from '../src/vocabulary';

describe('vocabularies', () => {
  it('theme codes match data/catalog/themes.yaml', () => {
    const yaml = parse(readFileSync(resolve(import.meta.dirname, '../../../data/catalog/themes.yaml'), 'utf8')) as Array<{ code: string }>;
    expect(yaml.map((t) => t.code)).toEqual([...THEME_CODES]);
  });

  it('every chip code has exactly one definition', () => {
    expect(CHIPS.map((c) => c.code).sort()).toEqual([...CHIP_CODES].sort());
  });

  it('every review topic has a German label', () => {
    expect(Object.keys(REVIEW_TOPIC_LABELS).sort()).toEqual([...REVIEW_TOPICS].sort());
  });
});
