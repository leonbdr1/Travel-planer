// Fake model for reiseplaner.wish-parse: keyword and typo-tolerant matching
// per text segment; segments without any code go to `unmatched` verbatim.
import type { FakeLlmResponder } from '@reiseplaner/providers';
import { editDistance, extractTag, fold, unneutralize } from './text';

type Field = 'chips' | 'themes' | 'review_topics';
interface Keyword {
  word: string;
  codes: Array<[Field, string]>;
}

const table: Array<[string[], Array<[Field, string]>]> = [
  [['sauber', 'clean', 'hygien', 'reinlich', 'gepflegt'], [['chips', 'sauber']]],
  [['ruhig', 'quiet', 'leise', 'ruhe im zimmer'], [['chips', 'ruhig']]],
  [['larm', 'strassenlarm', 'noise', 'noisy', 'laut'], [['chips', 'ruhig'], ['review_topics', 'laerm']]],
  [['fruhstuck', 'breakfast', 'halbpension', 'vollpension', 'all inclusive'], [['chips', 'fruehstueck']]],
  [['storn', 'cancel', 'flexibel buchbar'], [['chips', 'kostenlos_stornierbar']]],
  [['parkplatz', 'parken', 'parking', 'garage', 'stellplatz'], [['chips', 'parkplatz']]],
  [['hund', 'dog', 'haustier', 'pet'], [['chips', 'hund_erlaubt']]],
  [['sauna', 'spa', 'wellnesshotel', 'wellnessbereich', 'wellness', 'pool', 'whirlpool', 'dampfbad'], [['chips', 'sauna_wellness']]],
  [['wlan', 'wifi', 'wi-fi', 'internet'], [['chips', 'wlan']]],
  [['kuche', 'kochnische', 'kitchen', 'selbstversorg', 'kochen'], [['chips', 'kueche']]],
  [['barrierefrei', 'rollstuhl', 'wheelchair', 'accessible', 'stufenlos'], [['chips', 'barrierefrei']]],
  [['familienzimmer', 'family room'], [['chips', 'familienzimmer']]],
  [['wander', 'hiking', 'hike', 'trekking', 'bergtour'], [['themes', 'wandern']]],
  [['panorama', 'berge', 'bergen', 'alpen', 'mountain', 'gipfel', 'bergblick'], [['themes', 'bergpanorama']]],
  [['am see', 'an einem see', 'im see', 'seen', 'badesee', 'lake', 'lakes'], [['themes', 'seen']]],
  [['natur', 'nature', 'abgeschieden', 'einsam'], [['themes', 'natur_ruhe']]],
  [['rad', 'fahrrad', 'radfahren', 'bike', 'biking', 'cycling', 'mountainbike'], [['themes', 'radfahren']]],
  [['therme', 'thermal', 'wellness-urlaub', 'wellnessurlaub', 'kurort'], [['themes', 'wellness']]],
  [['ski', 'skifahren', 'langlauf', 'snowboard', 'rodeln', 'wintersport', 'skiing'], [['themes', 'wintersport']]],
  [['stadt', 'stadte', 'museum', 'museen', 'kultur', 'city', 'altstadt', 'sightseeing', 'sehenswurdigkeiten', 'architektur'], [['themes', 'staedte_kultur']]],
  [['shopping', 'einkaufen', 'einkaufsbummel', 'shoppen', 'outlet', 'grossstadt'], [['themes', 'shopping']]],
  [['strand', 'meer', 'kuste', 'beach', 'baden im meer', 'sandstrand'], [['themes', 'strand']]],
  [['wein', 'wine', 'kulinar', 'gutes essen', 'gourmet', 'restaurant'], [['themes', 'wein_kulinarik']]],
  [['familie', 'kinder', 'kids', 'family'], [['themes', 'familie']]],
  [['dreck', 'schmutz', 'dirty', 'unsauber'], [['review_topics', 'sauberkeit']]],
  [['schimmel', 'mold', 'mould'], [['review_topics', 'schimmel']]],
  [['bettwanzen', 'wanzen', 'ungeziefer', 'kakerlaken', 'bed bugs', 'bedbugs', 'milben', 'flohe'], [['review_topics', 'ungeziefer']]],
  [['geruch', 'gestank', 'stinkt', 'smell'], [['review_topics', 'geruch']]],
  [['renovierungsbedurftig', 'heruntergekommen', 'abgewohnt', 'kaputt', 'run-down'], [['review_topics', 'zustand']]],
  [['wie auf den fotos', 'wie auf den bildern', 'wie beschrieben', 'as described'], [['review_topics', 'abweichung_beschreibung']]],
];

const keywords: Keyword[] = table.flatMap(([words, codes]) => words.map((word) => ({ word, codes })));
const fillers = new Set(['bitte', 'danke', 'please', 'gerne', 'und', 'and']);
const SEPARATORS = /[,;.!?\n]+|\s+(?:und|and|sowie|plus|&)\s+/i;

function isTypo(word: string, keyword: string): boolean {
  if (editDistance(word, keyword) !== 1) return false;
  if (word.length >= 5 && keyword.length >= 5) return true;
  return word.length === keyword.length && [...word].sort().join('') === [...keyword].sort().join('');
}

interface Hit {
  start: number;
  end: number;
  keyword: Keyword;
}

function findHits(segment: string): Hit[] {
  const hits: Hit[] = [];
  for (const keyword of keywords) {
    let from = 0;
    for (;;) {
      const i = segment.indexOf(keyword.word, from);
      if (i < 0) break;
      const before = i === 0 ? ' ' : (segment[i - 1] ?? ' ');
      if (!/\p{L}/u.test(before)) hits.push({ start: i, end: i + keyword.word.length, keyword });
      from = i + 1;
    }
  }
  // Typos: one edit for words of five or more letters, only swapped
  // neighbours for four-letter words ("wlna"), so "sein" never becomes "wein".
  for (const m of segment.matchAll(/\p{L}[\p{L}-]*/gu)) {
    const word = m[0];
    if (word.length < 4) continue;
    for (const keyword of keywords) {
      if (keyword.word.length < 4 || keyword.word.includes(' ') || word === keyword.word) continue;
      if (isTypo(word, keyword.word)) hits.push({ start: m.index, end: m.index + word.length, keyword });
    }
  }
  // Longest match wins; overlapping shorter hits are dropped.
  hits.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const accepted: Hit[] = [];
  for (const h of hits) {
    if (!accepted.some((a) => h.start < a.end && a.start < h.end)) accepted.push(h);
  }
  return accepted;
}

export const fakeWishParse: FakeLlmResponder = ({ user }) => {
  const text = extractTag(user, 'wunsch');
  const out = { chips: [] as string[], themes: [] as string[], review_topics: [] as string[], unmatched: [] as string[] };
  for (const raw of text.split(SEPARATORS)) {
    const segment = raw.trim();
    if (!segment) continue;
    const hits = findHits(fold(segment));
    if (hits.length === 0) {
      if (!fillers.has(fold(segment))) out.unmatched.push(unneutralize(segment).slice(0, 300));
      continue;
    }
    for (const hit of hits) {
      for (const [field, code] of hit.keyword.codes) if (!out[field].includes(code)) out[field].push(code);
    }
  }
  out.unmatched = out.unmatched.slice(0, 10);
  return out;
};
