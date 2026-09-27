import { describe, expect, it } from 'vitest';
import { findClaimViolations, stripComments } from '../src/claims';

const forbidden = ['Bestpreis', 'garantiert', 'immer am günstigsten'];

describe('claims rule', () => {
  it('finds forbidden claims case-insensitively with line numbers', () => {
    const source = ["export const t = {", "  a: 'Garantiert günstig',", "  b: 'Wir sind IMMER am günstigsten',", '};'].join('\n');
    expect(findClaimViolations(source, forbidden)).toEqual([
      { line: 2, claim: 'garantiert', excerpt: "a: 'Garantiert günstig'," },
      { line: 3, claim: 'immer am günstigsten', excerpt: "b: 'Wir sind IMMER am günstigsten'," },
    ]);
  });

  it('matches claims inside compound words', () => {
    expect(findClaimViolations("x: 'Unsere Bestpreisgarantie'", forbidden).map((v) => v.claim)).toEqual(['Bestpreis']);
  });

  it('ignores comments but keeps URLs in strings', () => {
    const source = "// garantiert nur ein Kommentar\n/* Bestpreis */\nconst u = 'https://example.org/x'; // Bestpreis";
    expect(findClaimViolations(source, forbidden)).toEqual([]);
    expect(stripComments(source)).toContain("'https://example.org/x'");
  });

  it('accepts the allowed savings wording from the bargain text blocks', () => {
    const ok = '28 % günstiger als dieselbe Unterkunft an deinen anderen Terminen';
    expect(findClaimViolations(ok, forbidden)).toEqual([]);
  });
});
