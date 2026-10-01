import { describe, expect, it } from 'vitest';
import { adminAreaName, displayName } from '../src/admin-areas';
import { catalogCountry } from '../src/countries';
import { germanTranslit, normalizeQuery, searchText, slugify, stripDiacritics } from '../src/text';

describe('text normalisation', () => {
  it('strips diacritics and transliterates German umlauts', () => {
    expect(stripDiacritics('Füssen')).toBe('fussen');
    expect(germanTranslit('Füssen')).toBe('fuessen');
    expect(stripDiacritics('Straßberg')).toBe('strassberg');
    expect(normalizeQuery('  Bad   Tölz!! ')).toBe('bad tolz');
  });

  it('builds search text with all variants once', () => {
    expect(searchText(['Füssen'])).toBe('füssen fussen fuessen');
    expect(searchText(['Bolzano', 'Bozen'])).toBe('bolzano bozen');
  });

  it('slugifies names', () => {
    expect(slugify('Bad Hindelang')).toBe('bad-hindelang');
    expect(slugify('St. Ulrich in Gröden')).toBe('st-ulrich-in-groeden');
  });
});

describe('admin areas', () => {
  it('names states, cantons and South Tyrol in German', () => {
    expect(adminAreaName('DE', '02')).toBe('Bayern');
    expect(adminAreaName('AT', '07')).toBe('Tirol');
    expect(adminAreaName('CH', 'VS')).toBe('Wallis');
    expect(adminAreaName('IT', '17', 'BZ')).toBe('Südtirol');
    expect(adminAreaName('IT', '17', 'TN')).toBeNull();
  });

  it('maps catalog countries and prefers German names in South Tyrol', () => {
    expect(catalogCountry('IT', 'BZ')).toBe('IT-BZ');
    expect(catalogCountry('IT', '')).toBe('IT');
    expect(catalogCountry('FR')).toBe('FR');
    expect(catalogCountry('US')).toBeNull();
    expect(displayName('Merano', ['Meran'], 'IT')).toBe('Meran');
    expect(displayName('Oberstdorf', [], 'DE')).toBe('Oberstdorf');
    expect(displayName('Munich', ['München'], 'DE')).toBe('München');
  });
});
