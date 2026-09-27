import { describe, expect, it } from 'vitest';
import { normalizeGermanTypography } from '../src/typography';

describe('normalizeGermanTypography', () => {
  it('replaces em dashes and spaced hyphens with spaced en dashes', () => {
    expect(normalizeGermanTypography('Seen—Berge')).toBe('Seen – Berge');
    expect(normalizeGermanTypography('Seen -- Berge')).toBe('Seen – Berge');
    expect(normalizeGermanTypography('Seen - Berge')).toBe('Seen – Berge');
    expect(normalizeGermanTypography('Garmisch-Partenkirchen')).toBe('Garmisch-Partenkirchen');
  });

  it('uses German quotation marks, apostrophes and ellipsis', () => {
    expect(normalizeGermanTypography('Der "Malerweg" lockt')).toBe('Der „Malerweg“ lockt');
    expect(normalizeGermanTypography('So funktioniert\'s...')).toBe('So funktioniert’s…');
  });

  it('fixes spacing and abbreviations', () => {
    expect(normalizeGermanTypography('  Orte , z.B.  Füssen  ')).toBe('Orte, z. B. Füssen');
  });

  it('is idempotent', () => {
    const once = normalizeGermanTypography('Der "Weg" — schön... z.B. hier');
    expect(normalizeGermanTypography(once)).toBe(once);
  });
});
