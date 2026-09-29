// Facility labels in German (Aufgabe 12): LiteAPI sends the hotel facilities
// as English names that repeat across all houses. One central table
// translates them and sorts them into groups for a tidy display; names we do
// not know are not shown in English but counted (and logged by the worker, so
// the table can grow). German names (simulated world, providers with German
// texts) pass through.
export type FacilityGroup =
  | 'internet'
  | 'parken'
  | 'essen'
  | 'wellness'
  | 'draussen'
  | 'aktivitaeten'
  | 'zimmer'
  | 'service'
  | 'familie'
  | 'barrierefrei';

export const FACILITY_GROUPS: readonly FacilityGroup[] = ['internet', 'parken', 'essen', 'wellness', 'draussen', 'aktivitaeten', 'zimmer', 'familie', 'barrierefrei', 'service'];

type Entry = [label: string, group: FacilityGroup];

/** Keys: lower case, single spaces, "&" as "and". */
const TABLE: Record<string, Entry> = {
  // Internet
  'wifi available': ['WLAN verfügbar', 'internet'],
  wifi: ['WLAN', 'internet'],
  'free wifi': ['Kostenloses WLAN', 'internet'],
  'wifi in all areas': ['WLAN im ganzen Haus', 'internet'],
  'free wifi in all areas': ['Kostenloses WLAN im ganzen Haus', 'internet'],
  'internet services': ['Internet', 'internet'],
  internet: ['Internet', 'internet'],
  'free internet': ['Kostenloses Internet', 'internet'],
  'wired internet': ['Internet per Kabel', 'internet'],
  // Parking and getting around
  parking: ['Parkplatz', 'parken'],
  'free parking': ['Kostenloser Parkplatz', 'parken'],
  'private parking': ['Privatparkplatz', 'parken'],
  'on-site parking': ['Parkplatz am Haus', 'parken'],
  'street parking': ['Parken an der Straße', 'parken'],
  'secured parking': ['Gesicherter Parkplatz', 'parken'],
  'parking garage': ['Parkhaus', 'parken'],
  garage: ['Garage', 'parken'],
  'accessible parking': ['Behindertenparkplatz', 'parken'],
  'electric vehicle charging station': ['E-Ladestation', 'parken'],
  'ev charging station': ['E-Ladestation', 'parken'],
  'airport shuttle': ['Flughafentransfer', 'parken'],
  'free airport shuttle': ['Kostenloser Flughafentransfer', 'parken'],
  'shuttle service': ['Shuttleservice', 'parken'],
  'car hire': ['Autovermietung', 'parken'],
  'bicycle rental': ['Fahrradverleih', 'parken'],
  'bike rental': ['Fahrradverleih', 'parken'],
  'bicycle storage': ['Fahrradabstellraum', 'parken'],
  // Food and drink
  restaurant: ['Restaurant', 'essen'],
  bar: ['Bar', 'essen'],
  'snack bar': ['Snackbar', 'essen'],
  'coffee shop on site': ['Café im Haus', 'essen'],
  'breakfast in the room': ['Frühstück aufs Zimmer', 'essen'],
  breakfast: ['Frühstück', 'essen'],
  'breakfast buffet': ['Frühstücksbuffet', 'essen'],
  'room service': ['Zimmerservice', 'essen'],
  'packed lunches': ['Lunchpakete', 'essen'],
  'special diet menus (on request)': ['Spezielle Diätmenüs (auf Anfrage)', 'essen'],
  'vending machine (drinks)': ['Getränkeautomat', 'essen'],
  'vending machine (snacks)': ['Snackautomat', 'essen'],
  'wine/champagne': ['Wein und Sekt', 'essen'],
  'bbq facilities': ['Grillmöglichkeit', 'essen'],
  'barbecue facilities': ['Grillmöglichkeit', 'essen'],
  kitchen: ['Küche', 'zimmer'],
  kitchenette: ['Küchenzeile', 'zimmer'],
  'shared kitchen': ['Gemeinschaftsküche', 'zimmer'],
  // Wellness
  sauna: ['Sauna', 'wellness'],
  spa: ['Spa', 'wellness'],
  'spa and wellness centre': ['Spa- und Wellnessbereich', 'wellness'],
  'spa and wellness center': ['Spa- und Wellnessbereich', 'wellness'],
  'wellness centre': ['Wellnessbereich', 'wellness'],
  'wellness center': ['Wellnessbereich', 'wellness'],
  'fitness centre': ['Fitnessraum', 'wellness'],
  'fitness center': ['Fitnessraum', 'wellness'],
  'fitness room': ['Fitnessraum', 'wellness'],
  massage: ['Massage', 'wellness'],
  'steam room': ['Dampfbad', 'wellness'],
  'turkish/steam bath': ['Türkisches Dampfbad', 'wellness'],
  'hot tub/jacuzzi': ['Whirlpool', 'wellness'],
  'hot tub': ['Whirlpool', 'wellness'],
  jacuzzi: ['Whirlpool', 'wellness'],
  solarium: ['Solarium', 'wellness'],
  'swimming pool': ['Pool', 'wellness'],
  pool: ['Pool', 'wellness'],
  'indoor pool': ['Hallenbad', 'wellness'],
  'indoor swimming pool': ['Hallenbad', 'wellness'],
  'outdoor pool': ['Außenpool', 'wellness'],
  'outdoor swimming pool': ['Außenpool', 'wellness'],
  'heated pool': ['Beheizter Pool', 'wellness'],
  'beauty services': ['Kosmetikbehandlungen', 'wellness'],
  // Outdoors
  terrace: ['Terrasse', 'draussen'],
  garden: ['Garten', 'draussen'],
  balcony: ['Balkon', 'draussen'],
  'sun terrace': ['Sonnenterrasse', 'draussen'],
  'sun deck': ['Sonnendeck', 'draussen'],
  patio: ['Terrasse', 'draussen'],
  'outdoor furniture': ['Gartenmöbel', 'draussen'],
  'picnic area': ['Picknickplatz', 'draussen'],
  'beachfront': ['Direkt am Strand', 'draussen'],
  'private beach area': ['Privatstrand', 'draussen'],
  // Activities
  hiking: ['Wandern', 'aktivitaeten'],
  fishing: ['Angeln', 'aktivitaeten'],
  cycling: ['Radfahren', 'aktivitaeten'],
  skiing: ['Skifahren', 'aktivitaeten'],
  'ski storage': ['Skiraum', 'aktivitaeten'],
  'ski-to-door access': ['Direkt an der Piste', 'aktivitaeten'],
  'ski school': ['Skischule', 'aktivitaeten'],
  'ski equipment hire on site': ['Skiverleih im Haus', 'aktivitaeten'],
  'ski pass vendor': ['Skipassverkauf', 'aktivitaeten'],
  'tennis court': ['Tennisplatz', 'aktivitaeten'],
  golf: ['Golf', 'aktivitaeten'],
  'golf course (within 3 km)': ['Golfplatz in der Nähe', 'aktivitaeten'],
  'horse riding': ['Reiten', 'aktivitaeten'],
  canoeing: ['Kanufahren', 'aktivitaeten'],
  windsurfing: ['Windsurfen', 'aktivitaeten'],
  diving: ['Tauchen', 'aktivitaeten'],
  snorkelling: ['Schnorcheln', 'aktivitaeten'],
  'table tennis': ['Tischtennis', 'aktivitaeten'],
  billiards: ['Billard', 'aktivitaeten'],
  darts: ['Dart', 'aktivitaeten'],
  bowling: ['Kegeln', 'aktivitaeten'],
  'games room': ['Spielzimmer', 'aktivitaeten'],
  library: ['Bibliothek', 'aktivitaeten'],
  'walking tours': ['Stadtführungen', 'aktivitaeten'],
  'bike tours': ['Radtouren', 'aktivitaeten'],
  'evening entertainment': ['Abendunterhaltung', 'aktivitaeten'],
  // Rooms
  'non-smoking rooms': ['Nichtraucherzimmer', 'zimmer'],
  'non-smoking throughout': ['Rauchfreies Haus', 'zimmer'],
  'smoking area': ['Raucherbereich', 'zimmer'],
  heating: ['Heizung', 'zimmer'],
  'air conditioning': ['Klimaanlage', 'zimmer'],
  'family rooms': ['Familienzimmer', 'familie'],
  'soundproof rooms': ['Schallisolierte Zimmer', 'zimmer'],
  'allergy-free room': ['Allergikerzimmer', 'zimmer'],
  'hypoallergenic room available': ['Allergikerzimmer', 'zimmer'],
  'private bathroom': ['Eigenes Bad', 'zimmer'],
  'hairdryer': ['Haartrockner', 'zimmer'],
  'hair dryer': ['Haartrockner', 'zimmer'],
  'flat-screen tv': ['Flachbild-TV', 'zimmer'],
  television: ['Fernseher', 'zimmer'],
  tv: ['Fernseher', 'zimmer'],
  minibar: ['Minibar', 'zimmer'],
  safe: ['Safe', 'zimmer'],
  'safety deposit box': ['Schließfach', 'zimmer'],
  'washing machine': ['Waschmaschine', 'zimmer'],
  'laundry': ['Wäscheservice', 'service'],
  'ironing service': ['Bügelservice', 'service'],
  'dry cleaning': ['Reinigung', 'service'],
  'tea/coffee maker': ['Tee- und Kaffeezubehör', 'zimmer'],
  'coffee machine': ['Kaffeemaschine', 'zimmer'],
  'electric kettle': ['Wasserkocher', 'zimmer'],
  refrigerator: ['Kühlschrank', 'zimmer'],
  dishwasher: ['Spülmaschine', 'zimmer'],
  microwave: ['Mikrowelle', 'zimmer'],
  'upper floors accessible by elevator': ['Obere Etagen mit dem Aufzug erreichbar', 'barrierefrei'],
  elevator: ['Aufzug', 'barrierefrei'],
  lift: ['Aufzug', 'barrierefrei'],
  // Family and pets
  'pets allowed': ['Haustiere erlaubt', 'familie'],
  'pet friendly': ['Haustiere willkommen', 'familie'],
  'pets not allowed': ['Keine Haustiere', 'familie'],
  "kids' club": ['Kinderclub', 'familie'],
  'kids club': ['Kinderclub', 'familie'],
  "children's playground": ['Spielplatz', 'familie'],
  playground: ['Spielplatz', 'familie'],
  'babysitting/child services': ['Kinderbetreuung', 'familie'],
  'babysitting': ['Kinderbetreuung', 'familie'],
  "children's high chair": ['Kinderhochstuhl', 'familie'],
  'baby safety gates': ['Treppenschutzgitter', 'familie'],
  // Accessibility
  'facilities for disabled guests': ['Barrierefreie Einrichtungen', 'barrierefrei'],
  'wheelchair accessible': ['Rollstuhlgerecht', 'barrierefrei'],
  'entire unit wheelchair accessible': ['Ganze Unterkunft rollstuhlgerecht', 'barrierefrei'],
  'toilet with grab rails': ['WC mit Haltegriffen', 'barrierefrei'],
  'accessible': ['Barrierefrei', 'barrierefrei'],
  // Service
  '24-hour front desk': ['Rezeption rund um die Uhr', 'service'],
  'front desk (24 hours)': ['Rezeption rund um die Uhr', 'service'],
  '24 hour front desk': ['Rezeption rund um die Uhr', 'service'],
  'front desk': ['Rezeption', 'service'],
  'express check-in/check-out': ['Schneller Check-in und Check-out', 'service'],
  'private check-in/check-out': ['Privater Check-in und Check-out', 'service'],
  'tour desk': ['Tourenberatung', 'service'],
  'concierge service': ['Concierge', 'service'],
  concierge: ['Concierge', 'service'],
  'luggage storage': ['Gepäckaufbewahrung', 'service'],
  'daily housekeeping': ['Tägliche Reinigung', 'service'],
  'housekeeping': ['Zimmerreinigung', 'service'],
  'currency exchange': ['Geldwechsel', 'service'],
  atm: ['Geldautomat', 'service'],
  'atm/cash machine on site': ['Geldautomat im Haus', 'service'],
  'meeting/banquet facilities': ['Tagungs- und Festräume', 'service'],
  'business centre': ['Businesscenter', 'service'],
  'business center': ['Businesscenter', 'service'],
  'fax/photocopying': ['Fax und Kopierer', 'service'],
  'newspapers': ['Zeitungen', 'service'],
  'shops (on site)': ['Geschäfte im Haus', 'service'],
  'mini-market on site': ['Minimarkt im Haus', 'service'],
  'gift shop': ['Souvenirladen', 'service'],
  'grocery deliveries': ['Lebensmittellieferung', 'service'],
  'lockers': ['Schließfächer', 'service'],
  'security alarm': ['Alarmanlage', 'service'],
  'smoke alarms': ['Rauchmelder', 'service'],
  'fire extinguishers': ['Feuerlöscher', 'service'],
  'cctv outside property': ['Videoüberwachung außen', 'service'],
  'cctv in common areas': ['Videoüberwachung in Gemeinschaftsbereichen', 'service'],
  '24-hour security': ['Sicherheitsdienst rund um die Uhr', 'service'],
  'key card access': ['Zugang mit Schlüsselkarte', 'service'],
  'key access': ['Zugang mit Schlüssel', 'service'],
  'contactless check-in/out': ['Kontaktloser Check-in und Check-out', 'service'],
  'invoice provided': ['Rechnung möglich', 'service'],
};

/** German names of the simulated world and of providers with German texts: shown as they are. */
const GERMAN_GROUPS: Record<string, FacilityGroup> = {
  parkplatz: 'parken',
  'kostenloses wlan': 'internet',
  'haustiere erlaubt': 'familie',
  sauna: 'wellness',
  wellnessbereich: 'wellness',
  küche: 'zimmer',
  barrierefrei: 'barrierefrei',
  familienzimmer: 'familie',
  restaurant: 'essen',
  bar: 'essen',
  fahrradverleih: 'parken',
  skiraum: 'aktivitaeten',
  terrasse: 'draussen',
  garten: 'draussen',
  aufzug: 'barrierefrei',
  'e-ladestation': 'parken',
  frühstücksbuffet: 'essen',
  hallenbad: 'wellness',
  'rezeption 24 h': 'service',
  nichtraucherzimmer: 'zimmer',
};

const key = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ')
    .replace(/[.:;]+$/, '');

export interface FacilityDe {
  label: string;
  group: FacilityGroup;
}

/** German label and group of one facility name; null when it is unknown (English we cannot translate). */
export function facilityDe(name: string): FacilityDe | null {
  const k = key(name);
  const hit = TABLE[k];
  if (hit) return { label: hit[0], group: hit[1] };
  const german = GERMAN_GROUPS[k];
  return german ? { label: name.trim(), group: german } : null;
}

/** All facilities translated, without duplicates, in group order; unknown names separately (never shown in English). */
export function facilitiesDe(names: readonly string[]): { groups: Array<{ group: FacilityGroup; labels: string[] }>; unknown: string[] } {
  const byGroup = new Map<FacilityGroup, string[]>();
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const f = facilityDe(name);
    if (!f) {
      if (name.trim()) unknown.push(name.trim());
      continue;
    }
    if (seen.has(f.label)) continue;
    seen.add(f.label);
    byGroup.set(f.group, [...(byGroup.get(f.group) ?? []), f.label]);
  }
  return { groups: FACILITY_GROUPS.filter((g) => byGroup.has(g)).map((group) => ({ group, labels: byGroup.get(group) ?? [] })), unknown };
}
