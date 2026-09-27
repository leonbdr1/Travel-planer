// Fake model for reiseplaner.review-verify: finds the complaint keyword of
// the snippet's topic (DE, EN, FR, IT, NL) and treats it as a complaint
// unless a negation stands within the three words before it.
import type { FakeLlmResponder } from '@reiseplaner/providers';
import { extractTag, fold } from './text';

const complaintWords: Record<string, string[]> = {
  sauberkeit: ['schmutzig', 'dreckig', 'unsauber', 'verdreckt', 'flecken', 'haare', 'nicht sauber', 'dirty', 'filthy', 'stains', 'not clean', 'sale', 'sales', 'taches', 'pas propre', 'sporco', 'sporca', 'sporchi', 'macchie', 'non pulito', 'vies', 'smerig', 'vlekken', 'niet schoon'],
  schimmel: ['schimmel', 'schimmelig', 'stockflecken', 'mold', 'mould', 'moldy', 'mouldy', 'moisissure', 'moisi', 'muffa'],
  ungeziefer: ['bettwanzen', 'wanzen', 'kakerlaken', 'schaben', 'mause', 'flohe', 'ungeziefer', 'bed bugs', 'bedbugs', 'cockroach', 'cockroaches', 'mice', 'fleas', 'punaises', 'cafards', 'souris', 'cimici', 'scarafaggi', 'topi', 'bedwantsen', 'kakkerlakken', 'muizen'],
  laerm: ['larm', 'laut', 'strassenlarm', 'hellhorig', 'noise', 'noisy', 'loud', 'thin walls', 'bruit', 'bruyant', 'rumore', 'rumoroso', 'lawaai', 'luidruchtig', 'gehorig'],
  geruch: ['geruch', 'gestank', 'stinkt', 'muffig', 'riecht', 'smell', 'smelly', 'stink', 'odeur', 'puait', 'odore', 'puzza', 'stank', 'geur'],
  zustand: ['kaputt', 'defekt', 'abgewohnt', 'renovierungsbedurftig', 'heruntergekommen', 'broken', 'run-down', 'worn', 'casse', 'vetuste', 'rotto', 'fatiscente', 'kapot', 'versleten'],
  abweichung_beschreibung: ['anders als auf den fotos', 'nicht wie beschrieben', 'not as described', 'not like the pictures', 'pas comme sur les photos', 'diverso dalle foto', 'niet zoals beschreven'],
};
const negations = new Set(['kein', 'keine', 'keinen', 'keiner', 'nicht', 'ohne', 'nie', 'no', 'not', 'never', 'without', 'pas', 'aucun', 'aucune', 'sans', 'jamais', 'non', 'nessun', 'nessuna', 'senza', 'niente', 'geen', 'niet', 'zonder', 'nooit']);
const severeWords = ['ekelhaft', 'verdreckt', 'filthy', 'disgusting', 'degoutant', 'schifo', 'smerig'];

interface Snippet {
  id: string;
  topicHint: string;
  text: string;
}

function judge(snippet: Snippet): { isComplaint: boolean; severity: 'low' | 'medium' | 'high' } {
  const text = fold(snippet.text);
  const words = complaintWords[snippet.topicHint] ?? [];
  let complaint = false;
  for (const word of words) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(word, from);
      if (i < 0) break;
      from = i + 1;
      if (i > 0 && /\p{L}/u.test(text[i - 1] ?? '')) continue;
      const before = text.slice(0, i).split(/[^\p{L}]+/u).filter(Boolean).slice(-3);
      const negated = !word.split(' ').some((w) => negations.has(w)) && before.some((w) => negations.has(w));
      if (!negated) complaint = true;
    }
  }
  if (!complaint) return { isComplaint: false, severity: 'low' };
  const high =
    snippet.topicHint === 'schimmel' ||
    snippet.topicHint === 'ungeziefer' ||
    (snippet.topicHint === 'sauberkeit' && severeWords.some((w) => text.includes(w)));
  return { isComplaint: true, severity: high ? 'high' : 'medium' };
}

export const fakeReviewVerify: FakeLlmResponder = ({ user }) => {
  let snippets: Snippet[] = [];
  try {
    snippets = JSON.parse(extractTag(user, 'ausschnitte')) as Snippet[];
  } catch {
    snippets = [];
  }
  return {
    findings: snippets.map((s) => ({ snippetId: s.id, topic: s.topicHint, ...judge(s) })),
  };
};
