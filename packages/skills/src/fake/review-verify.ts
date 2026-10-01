// Fake model for reiseplaner.review-verify: a deterministic rule set that
// works sentence by sentence (DE, EN, FR, IT, NL and, since 1.1.0, ES, PT,
// PL, CS, HR, HU, DA, SV, NO, EL). A complaint keyword of the
// topic counts unless the sentence is a question, a comparison ("sauberer als
// erwartet"), about another accommodation, or the keyword is negated in the
// three words before it or followed by praise ("smelled fresh"). Minor
// wording lowers the severity. If the hinted topic has no complaint, other
// topics are tried (the model may reassign the topic).
import type { FakeLlmResponder } from '@reiseplaner/providers';
import { extractTag, fold } from './text';

type Severity = 'low' | 'medium' | 'high';

const complaintWords: Record<string, string[]> = {
  sauberkeit: ['schmutzig', 'dreckig', 'unsauber', 'verdreckt', 'flecken', 'fleckig', 'haare', 'nicht sauber', 'dirty', 'filthy', 'stains', 'not clean', 'sale', 'sales', 'taches', 'tache', 'pas propre', 'sporco', 'sporca', 'sporchi', 'macchie', 'non pulito', 'vies', 'smerig', 'vlekken', 'haren', 'niet schoon', 'sucio', 'sucia', 'suciedad', 'no estaba limpio', 'sujo', 'suja', 'sujidade', 'brudn', 'brudna', 'brudny', 'spinavy', 'spinava', 'prljav', 'prljava', 'prljavo', 'koszos', 'piszkos', 'beskidt', 'snavset', 'smutsig', 'smutsigt', 'skitten', 'skittent', 'βρωμικο', 'βρωμικα'],
  schimmel: ['schimmel', 'schimmelig', 'stockflecken', 'mold', 'mould', 'moldy', 'mouldy', 'moisissure', 'moisi', 'muffa', 'moho', 'mofo', 'bolor', 'plesn', 'zagrzybiony', 'plisen', 'plijesan', 'plijesni', 'penesz', 'peneszes', 'skimmel', 'mogel', 'mugg', 'μουχλα'],
  ungeziefer: ['bettwanzen', 'wanzen', 'kakerlaken', 'schaben', 'mause', 'flohe', 'ungeziefer', 'bed bugs', 'bedbugs', 'cockroach', 'cockroaches', 'mice', 'fleas', 'punaises', 'cafards', 'souris', 'cimici', 'scarafaggi', 'topi', 'bedwantsen', 'kakkerlakken', 'muizen', 'chinches', 'cucarachas', 'percevejos', 'baratas', 'pluskwy', 'karaluchy', 'stenice', 'svabi', 'stjenice', 'zohari', 'poloska', 'csotany', 'csotanyok', 'væggelus', 'kakerlakker', 'vaggloss', 'kackerlackor', 'veggdyr', 'κοριοι', 'κατσαριδες'],
  laerm: ['larm', 'laut', 'strassenlarm', 'hellhorig', 'noise', 'noisy', 'loud', 'thin walls', 'bruit', 'bruyant', 'rumore', 'rumoroso', 'rumorosa', 'rumorosi', 'lawaai', 'luidruchtig', 'gehorig', 'ruido', 'ruidoso', 'barulho', 'barulhento', 'hałas', 'hałasu', 'głosno', 'hluk', 'hlucne', 'buka', 'bucno', 'zaj', 'hangos', 'støj', 'buller', 'oljud', 'støy', 'θορυβος', 'θορυβο'],
  geruch: ['geruch', 'gestank', 'stinkt', 'muffig', 'riecht', 'roch', 'smell', 'smelly', 'smelled', 'stink', 'odeur', 'puait', 'odore', 'puzza', 'stank', 'geur', 'mal olor', 'olor', 'cheiro', 'mau cheiro', 'smrod', 'zapach', 'smrad', 'buz', 'szag', 'lugt', 'lukt', 'μυρωδια'],
  zustand: ['kaputt', 'defekt', 'abgewohnt', 'abgenutzt', 'durchgelaufen', 'renovierungsbedurftig', 'heruntergekommen', 'broken', 'run-down', 'worn', 'casse', 'vetuste', 'usee', 'rotto', 'fatiscente', 'kapot', 'versleten', 'roto', 'rota', 'no funcionaba', 'avariado', 'partido', 'nao funcionava', 'zepsuty', 'zepsuta', 'nie działał', 'nie działała', 'rozbity', 'nefungoval', 'pokvaren', 'pokvarena', 'nije radio', 'nije radila', 'torott', 'nem mukodott', 'ødelagt', 'slidt', 'trasig', 'sliten', 'slitt', 'χαλασμενο', 'δεν λειτουργουσε'],
  abweichung_beschreibung: ['anders als auf den fotos', 'anders aus als auf den fotos', 'bilder im internet', 'nicht wie beschrieben', 'not as described', 'not like the pictures', 'pas comme sur les photos', 'diverso dalle foto', 'niet zoals beschreven', 'no como en las fotos', 'diferente das fotos', 'niezgodne z opisem', 'neodpovida popisu', 'ne odgovara opisu', 'nem felel meg a leirasnak', 'ikke som beskrevet', 'inte som beskrivet', 'δεν αντιστοιχει'],
};
const negations = new Set(['kein', 'keine', 'keinen', 'keiner', 'nicht', 'nichts', 'ohne', 'nie', 'no', 'not', 'nothing', 'never', 'without', 'pas', 'aucun', 'aucune', 'sans', 'jamais', 'rien', 'non', 'nessun', 'nessuna', 'senza', 'niente', 'geen', 'niet', 'niets', 'zonder', 'nooit', 'nunca', 'sin', 'ningun', 'ninguna', 'nada', 'nao', 'sem', 'nenhum', 'bez', 'zadnego', 'zadnej', 'nigdy', 'ne', 'zadny', 'zadna', 'nebyl', 'nebyla', 'nebylo', 'nema', 'nije', 'nisu', 'nem', 'nincs', 'ikke', 'ingen', 'intet', 'uden', 'aldrig', 'inte', 'inga', 'inget', 'utan', 'uten', 'aldri', 'δεν', 'οχι', 'χωρις', 'καθολου']);
const comparisonWords = new Set(['weniger', 'less', 'moins', 'meno', 'minder']);
const comparisonPhrases = ['als erwartet', 'als befurchtet', 'than expected', 'than we feared', 'than feared', 'que prevu', 'del previsto', 'dan verwacht'];
const otherPlacePhrases = ['letzten hotel', 'anderen hotel', 'vorherigen hotel', 'previous hotel', 'other hotel', 'last hotel', 'autre hotel', 'altro hotel', 'vorige hotel', 'ander hotel'];
const praiseAfter = new Set(['frisch', 'fresh', 'angenehm', 'pleasant', 'lovely', 'nice', 'good', 'gut', 'bon', 'buono', 'fris', 'lekker', 'clean']);
const minorWords = new Set(['leicht', 'etwas', 'klein', 'kleine', 'kleiner', 'slightly', 'bit', 'small', 'minor', 'peu', 'petit', 'petite', 'po', 'piccolo', 'piccola', 'beetje']);
const severeWords = ['ekelhaft', 'verdreckt', 'filthy', 'disgusting', 'urine', 'degoutant', 'schifo', 'smerig'];

interface Snippet {
  id: string;
  topicHint: string;
  text: string;
}

const words = (s: string) => s.split(/[^\p{L}'-]+/u).filter(Boolean);

/** Complaint in one sentence for one topic: severity, or null. */
function sentenceComplaint(sentence: string, topic: string): Severity | null {
  if (sentence.trim().endsWith('?')) return null;
  if (comparisonPhrases.some((p) => sentence.includes(p))) return null;
  if (otherPlacePhrases.some((p) => sentence.includes(p))) return null;
  let found: Severity | null = null;
  for (const word of complaintWords[topic] ?? []) {
    for (let i = sentence.indexOf(word); i >= 0; i = sentence.indexOf(word, i + 1)) {
      if (i > 0 && /\p{L}/u.test(sentence[i - 1] ?? '')) continue;
      const before = words(sentence.slice(0, i)).slice(-3);
      const after = words(sentence.slice(i + word.length)).slice(0, 2);
      const ownNegation = word.split(' ').some((w) => negations.has(w));
      if (!ownNegation && before.some((w) => negations.has(w))) continue;
      if (before.some((w) => comparisonWords.has(w))) continue;
      if (after.some((w) => praiseAfter.has(w))) continue;
      const minor = before.some((w) => minorWords.has(w));
      const high = topic === 'schimmel' || topic === 'ungeziefer' || (topic === 'sauberkeit' && severeWords.some((w) => sentence.includes(w)));
      const severity: Severity = minor ? 'low' : high ? 'high' : 'medium';
      if (found === null || rank(severity) > rank(found)) found = severity;
    }
  }
  return found;
}

const rank = (s: Severity) => (s === 'high' ? 2 : s === 'medium' ? 1 : 0);

function judge(snippet: Snippet): { topic: string; isComplaint: boolean; severity: Severity } {
  const sentences = fold(snippet.text).match(/[^.!?;]+[.!?;]?/g) ?? [];
  const inTopic = (topic: string) =>
    sentences.reduce<Severity | null>((best, s) => {
      const sev = sentenceComplaint(s, topic);
      return sev !== null && (best === null || rank(sev) > rank(best)) ? sev : best;
    }, null);
  const own = inTopic(snippet.topicHint);
  if (own) return { topic: snippet.topicHint, isComplaint: true, severity: own };
  for (const topic of Object.keys(complaintWords)) {
    if (topic === snippet.topicHint) continue;
    const other = inTopic(topic);
    if (other) return { topic, isComplaint: true, severity: other };
  }
  return { topic: snippet.topicHint, isComplaint: false, severity: 'low' };
}

export const fakeReviewVerify: FakeLlmResponder = ({ user }) => {
  let snippets: Snippet[] = [];
  try {
    snippets = JSON.parse(extractTag(user, 'ausschnitte')) as Snippet[];
  } catch {
    snippets = [];
  }
  return {
    findings: snippets.map((s) => ({ snippetId: s.id, ...judge(s) })),
  };
};
