// Provider texts (hotel description, important information) arrive as HTML
// ("<p><strong>Charming Accommodation</strong></p><p>…") or as plain text
// with line breaks. The SPA never renders provider markup: this module turns
// them into headings, paragraphs and lists, decodes entities and drops every
// other tag. Pure; runs in the Worker and in tests.

export type TextBlock = { kind: 'heading'; text: string } | { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] };

/** A line in bold only, up to this length, reads as a heading. */
const HEADING_MAX_CHARS = 90;
const MAX_BLOCKS = 80;
const MAX_BLOCK_CHARS = 3000;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  shy: '',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
  szlig: 'ß',
  eacute: 'é',
  egrave: 'è',
  aacute: 'á',
  agrave: 'à',
  ccedil: 'ç',
  euro: '€',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  laquo: '«',
  raquo: '»',
  middot: '·',
  bull: '•',
  deg: '°',
  copy: '©',
  reg: '®',
  trade: '™',
  times: '×',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,8});/gi, (match, code: string) => {
    if (code.startsWith('#')) {
      const n = code[1] === 'x' || code[1] === 'X' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code] ?? match;
  });
}

const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'header', 'footer', 'blockquote', 'table', 'tr', 'dl', 'dt', 'dd', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const STRONG_TAGS = new Set(['strong', 'b']);
const BULLET = /^\s*(?:[•·▪◦‣*]|-(?=\s))\s*/;

interface Segment {
  text: string;
  strong: boolean;
}

const clean = (s: string) =>
  s
    .replace(/[​-‍﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BLOCK_CHARS);

/**
 * Headings, paragraphs and lists of a provider text. A line break (`<br>` or a
 * newline) ends a line; every line becomes its own block, a line entirely in
 * bold becomes a heading, consecutive lines starting with a bullet become a list.
 */
export function textBlocks(input: string | null | undefined): TextBlock[] {
  if (!input) return [];
  const source = input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/\r\n?/g, '\n');
  // In HTML a newline is only whitespace; in plain text it ends a line.
  const html = /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(source);
  const blocks: TextBlock[] = [];
  let line: Segment[] = [];
  let heading = false;
  let strongDepth = 0;
  let listItems: string[] | null = null;
  let item: string | null = null;
  let pendingBullets: string[] = [];

  const flushBullets = () => {
    if (pendingBullets.length >= 2) blocks.push({ kind: 'list', items: pendingBullets });
    else for (const text of pendingBullets) blocks.push({ kind: 'paragraph', text });
    pendingBullets = [];
  };
  const endLine = () => {
    const text = clean(line.map((s) => s.text).join(''));
    const visible = line.filter((s) => s.text.trim() !== '');
    const bold = visible.length > 0 && visible.every((s) => s.strong);
    line = [];
    if (!text) return;
    if (item !== null) {
      item = item ? `${item} ${text}` : text;
      return;
    }
    const bullet = BULLET.test(text) ? clean(text.replace(BULLET, '')) : null;
    if (bullet) {
      pendingBullets.push(bullet);
      return;
    }
    flushBullets();
    blocks.push((heading || bold) && text.length <= HEADING_MAX_CHARS ? { kind: 'heading', text } : { kind: 'paragraph', text });
  };
  const endItem = () => {
    endLine();
    if (item !== null && listItems) {
      const text = clean(item);
      if (text) listItems.push(text);
    }
    item = null;
  };
  const endList = () => {
    endItem();
    if (listItems && listItems.length > 0) {
      flushBullets();
      blocks.push({ kind: 'list', items: listItems });
    }
    listItems = null;
  };
  const addText = (raw: string) => {
    const parts = html ? [decodeEntities(raw.replace(/\n/g, ' '))] : decodeEntities(raw).split('\n');
    parts.forEach((part, i) => {
      if (i > 0) endLine();
      if (part) line.push({ text: part, strong: strongDepth > 0 || heading });
    });
  };

  const token = /<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>|([^<]+)|(<)/gi;
  for (const m of source.matchAll(token)) {
    const [, closing, rawName, selfClosing, text, lone] = m;
    if (text !== undefined || lone !== undefined) {
      addText(text ?? lone ?? '');
      continue;
    }
    const name = (rawName ?? '').toLowerCase();
    if (name === 'br') {
      endLine();
    } else if (STRONG_TAGS.has(name)) {
      if (!selfClosing) strongDepth = Math.max(0, strongDepth + (closing ? -1 : 1));
    } else if (name === 'ul' || name === 'ol') {
      if (closing) endList();
      else if (listItems === null) {
        endLine();
        listItems = [];
      }
    } else if (name === 'li') {
      if (listItems === null) {
        endLine();
        listItems = [];
      }
      endItem();
      if (!closing) item = '';
    } else if (BLOCK_TAGS.has(name)) {
      endLine();
      if (HEADING_TAGS.has(name)) heading = !closing;
    }
    if (blocks.length >= MAX_BLOCKS) break;
  }
  endList();
  endLine();
  flushBullets();
  return blocks.slice(0, MAX_BLOCKS);
}

const GERMAN = new Set(
  'der die das den dem des und ist sind mit für ein eine einen einem nicht auf im zu zum zur von vom wird werden kann können bei vor nach oder auch haben hat ihr ihre sie es sich über unter alle diese dieser dieses gäste unterkunft zimmer verfügbar bitte beachten'.split(' '),
);
const ENGLISH = new Set(
  'the and is are with for a not on to of be may can at by or this that these property guests guest room rooms will from your you all please note available must which'.split(' '),
);

/** "de", "en" or null when a text is too short or too mixed to tell (German and English only). */
export function guessLanguage(text: string): 'de' | 'en' | null {
  const words = text.toLocaleLowerCase('de-DE').match(/\p{L}+/gu) ?? [];
  let de = 0;
  let en = 0;
  for (const w of words) {
    if (GERMAN.has(w)) de += 1;
    if (ENGLISH.has(w)) en += 1;
  }
  if (de >= 2 && de >= 2 * en) return 'de';
  if (en >= 2 && en >= 2 * de) return 'en';
  return null;
}

/** The language of a set of blocks (all their text together). */
export function blocksLanguage(blocks: readonly TextBlock[]): 'de' | 'en' | null {
  return guessLanguage(blocks.map((b) => (b.kind === 'list' ? b.items.join(' ') : b.text)).join(' '));
}
