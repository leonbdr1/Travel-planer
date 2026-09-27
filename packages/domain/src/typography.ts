// Deterministic German typography for AI-generated texts ("KI-Tell-Scrubber",
// Golden Playbook Nr. 16; port of the documented normalizeGermanTypography
// contract – the Frontlift original was not reachable, see HANDOFF.md):
// no em dash, German quotation marks, typographic apostrophe and ellipsis,
// spaced abbreviations, single spaces.
export function normalizeGermanTypography(input: string): string {
  let text = input;
  // Em dash (and double hyphen) → spaced en dash.
  text = text.replace(/\s*(—|--)\s*/g, ' – ');
  // Spaced hyphen between words → spaced en dash.
  text = text.replace(/(\S) - (\S)/g, '$1 – $2');
  // Straight or English double quotes → „…“
  text = text.replace(/["“”]([^"“”]*)["“”]/g, '„$1“');
  // Apostrophes inside words → ’
  text = text.replace(/(\p{L})'(\p{L})/gu, '$1’$2');
  // Three dots → ellipsis
  text = text.replace(/\.{3}/g, '…');
  // Common abbreviations with narrow spacing
  text = text.replace(/\bz\.\s?B\./g, 'z. B.').replace(/\bd\.\s?h\./g, 'd. h.').replace(/\bu\.\s?a\./g, 'u. a.');
  // Whitespace: no space before punctuation, single spaces, trimmed.
  text = text.replace(/\s+([,.;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();
  return text;
}
