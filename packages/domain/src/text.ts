// Text normalisation for name search (pure).

/** Lower case without diacritics: "Füssen" → "fussen", "Grünwald" → "grunwald". */
export function stripDiacritics(value: string): string {
  return value
    .toLocaleLowerCase('de-DE')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}

/** German transliteration: "Füssen" → "fuessen". */
export function germanTranslit(value: string): string {
  return value
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalises user input for the locality search. */
export function normalizeQuery(value: string): string {
  return stripDiacritics(value).replace(/[^\p{L}\p{N} .'-]/gu, '').slice(0, 60);
}

/** All searchable variants of a set of names, de-duplicated. */
export function searchNames(names: readonly string[]): string[] {
  const variants = new Set<string>();
  for (const name of names) {
    if (!name) continue;
    variants.add(name.toLocaleLowerCase('de-DE').replace(/\s+/g, ' ').trim());
    variants.add(stripDiacritics(name));
    variants.add(germanTranslit(name));
  }
  return [...variants];
}

/** The variants joined by spaces (trigram matching). */
export function searchText(names: readonly string[]): string {
  return searchNames(names).join(' ');
}

/** URL-safe slug: "Bad Hindelang" → "bad-hindelang". */
export function slugify(value: string): string {
  return germanTranslit(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
