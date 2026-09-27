// Simulated accommodation world for PROVIDERS_MODE=fake.
//
// Every location (rounded to 0.01°) deterministically gets a set of hotels;
// prices depend on season, weekday, occupancy and a per-date noise, some
// dates carry a deal (date bargains), some hotels have few but perfect
// reviews (quality score), and some have recurring complaints in their
// reviews (review check). All data is synthetic – no real hotels.
import { base64UrlDecode, base64UrlEncode, between, hashString, intBetween, pick, seeded } from './random';

export type HotelKind = 'Hotel' | 'Gasthof' | 'Pension' | 'Landhotel' | 'Apartments' | 'Boutique-Hotel' | 'Ferienwohnung';
export type IssueProfile = 'none' | 'mold' | 'noise' | 'dirty' | 'bugs' | 'smell' | 'condition' | 'photos';

export interface FakeRoom {
  code: string;
  name: string;
  maxOccupancy: number;
  factor: number;
}

export interface FakeHotel {
  id: string;
  name: string;
  kind: HotelKind;
  stars: number | null;
  /** 0–10 or null (no reviews yet). */
  rating: number | null;
  reviewCount: number;
  lat: number;
  lng: number;
  address: string;
  basePerNightCents: number;
  cityTaxCentsPerPersonNight: number;
  taxesKnown: boolean;
  facilityIds: number[];
  photo: string;
  rooms: FakeRoom[];
  boards: Array<'RO' | 'BB' | 'HB'>;
  nonRefundableOffered: boolean;
  issue: IssueProfile;
  availability: number;
}

export const FAKE_FACILITIES: ReadonlyArray<{ id: number; name: string }> = [
  { id: 1, name: 'Parkplatz' },
  { id: 2, name: 'Kostenloses WLAN' },
  { id: 3, name: 'Haustiere erlaubt' },
  { id: 4, name: 'Sauna' },
  { id: 5, name: 'Wellnessbereich' },
  { id: 6, name: 'Küche' },
  { id: 7, name: 'Barrierefrei' },
  { id: 8, name: 'Familienzimmer' },
  { id: 9, name: 'Restaurant' },
  { id: 10, name: 'Bar' },
  { id: 11, name: 'Fahrradverleih' },
  { id: 12, name: 'Skiraum' },
  { id: 13, name: 'Terrasse' },
  { id: 14, name: 'Garten' },
  { id: 15, name: 'Aufzug' },
  { id: 16, name: 'E-Ladestation' },
  { id: 17, name: 'Frühstücksbuffet' },
  { id: 18, name: 'Hallenbad' },
  { id: 19, name: 'Rezeption 24 h' },
  { id: 20, name: 'Nichtraucherzimmer' },
];

const NAME_WORDS = [
  'Alpenblick', 'Bergfrieden', 'Sonnenhof', 'Zur Post', 'Rose', 'Hirsch', 'Adler', 'Krone', 'Seeblick',
  'Waldesruh', 'Edelweiß', 'Enzian', 'Bergkristall', 'Almrausch', 'Tannenhof', 'Lindenhof', 'Am Markt',
  'Schlossblick', 'Rebstock', 'Traube', 'Löwen', 'Bären', 'Schwanen', 'Sonnenhang', 'Talblick', 'Wiesengrund',
  'Kastanienhof', 'Birkenhof', 'Bachhaus', 'Alte Mühle', 'Panorama', 'Kaiserblick', 'Felsenkeller', 'Fischerhaus',
  'Weinberg', 'Brunnenhof', 'Morgenrot', 'Heidehof', 'Uferhaus', 'Gipfelglück',
];
const STREETS = ['Dorfstraße', 'Hauptstraße', 'Kirchweg', 'Am Bach', 'Seestraße', 'Bergstraße', 'Mühlweg', 'Lindenallee', 'Marktplatz', 'Sonnenweg'];

const KINDS: ReadonlyArray<[HotelKind, number]> = [
  ['Hotel', 0.4],
  ['Gasthof', 0.14],
  ['Pension', 0.14],
  ['Landhotel', 0.09],
  ['Apartments', 0.09],
  ['Ferienwohnung', 0.07],
  ['Boutique-Hotel', 0.07],
];

function weighted<T>(r: () => number, items: ReadonlyArray<[T, number]>): T {
  let x = r();
  for (const [item, w] of items) {
    if (x < w) return item;
    x -= w;
  }
  return items[items.length - 1]![0];
}

function starsFor(kind: HotelKind, r: () => number): number | null {
  switch (kind) {
    case 'Hotel':
      return weighted(r, [[3, 0.45], [4, 0.35], [2, 0.1], [5, 0.1]]);
    case 'Boutique-Hotel':
      return weighted(r, [[4, 0.7], [5, 0.3]]);
    case 'Landhotel':
      return weighted(r, [[3, 0.5], [4, 0.5]]);
    case 'Gasthof':
    case 'Pension':
      return weighted(r, [[2, 0.4], [3, 0.5], [null, 0.1]]);
    default:
      return weighted(r, [[null, 0.6], [3, 0.3], [4, 0.1]]);
  }
}

function basePriceEur(kind: HotelKind, stars: number | null, r: () => number): number {
  if (kind === 'Apartments' || kind === 'Ferienwohnung') return between(r, 78, 150);
  const s = stars ?? 2;
  const table: Record<number, [number, number]> = { 1: [55, 75], 2: [65, 95], 3: [92, 140], 4: [128, 205], 5: [215, 360] };
  const [min, max] = table[s] ?? [90, 140];
  return between(r, min, max) * (kind === 'Boutique-Hotel' ? 1.12 : 1);
}

// Better-rated houses cost more, as in real markets; without this link every
// well-rated cheap house would look like a bargain (S6.4 calibration).
function qualityPriceFactor(rating: number | null): number {
  if (rating === null) return 1;
  return 0.8 + 0.1 * (Math.min(rating, 9.5) - 6.3);
}

function roomsFor(kind: HotelKind, r: () => number): FakeRoom[] {
  if (kind === 'Apartments' || kind === 'Ferienwohnung') {
    return [
      { code: 'APT', name: 'Apartment mit Küche', maxOccupancy: 4, factor: 1 },
      ...(r() < 0.5 ? [{ code: 'APTL', name: 'Apartment Deluxe mit Balkon', maxOccupancy: 5, factor: 1.3 }] : []),
    ];
  }
  const rooms: FakeRoom[] = [{ code: 'DZS', name: 'Doppelzimmer Standard', maxOccupancy: 2, factor: 1 }];
  if (r() < 0.6) rooms.push({ code: 'DZK', name: 'Doppelzimmer Komfort mit Balkon', maxOccupancy: 2, factor: 1.18 });
  if (r() < 0.45) rooms.push({ code: 'FAM', name: 'Familienzimmer', maxOccupancy: 4, factor: 1.4 });
  if (r() < 0.35) rooms.push({ code: 'EZ', name: 'Einzelzimmer', maxOccupancy: 1, factor: 0.72 });
  return rooms;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function anchorOf(lat: number, lng: number): { latE2: number; lngE2: number } {
  return { latE2: Math.round(lat * 100), lngE2: Math.round(lng * 100) };
}

export function hotelId(latE2: number, lngE2: number, index: number): string {
  return `lpf-${latE2}-${lngE2}-${index}`;
}

export function parseHotelId(id: string): { latE2: number; lngE2: number; index: number } | null {
  const m = /^lpf-(-?\d+)-(-?\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  return { latE2: Number(m[1]), lngE2: Number(m[2]), index: Number(m[3]) };
}

export function hotelCountAt(latE2: number, lngE2: number): number {
  return intBetween(seeded('count', latE2, lngE2), 5, 14);
}

export function generateHotel(latE2: number, lngE2: number, index: number): FakeHotel {
  const r = seeded('hotel', latE2, lngE2, index);
  const kind = weighted(r, KINDS);
  const stars = starsFor(kind, r);
  const word = pick(r, NAME_WORDS);
  const name =
    kind === 'Apartments'
      ? `Apartments ${word}`
      : kind === 'Ferienwohnung'
        ? `Ferienwohnung ${word}`
        : `${kind} ${word}`;
  // Review profile: some hotels have no reviews, some few but perfect ones.
  const profile = weighted(r, [
    ['normal', 0.8],
    ['few_perfect', 0.08],
    ['none', 0.05],
    ['many_top', 0.07],
  ] as const);
  let rating: number | null;
  let reviewCount: number;
  if (profile === 'none') {
    rating = null;
    reviewCount = 0;
  } else if (profile === 'few_perfect') {
    rating = 10;
    reviewCount = intBetween(r, 2, 6);
  } else if (profile === 'many_top') {
    rating = round2(between(r, 8.8, 9.4));
    reviewCount = intBetween(r, 300, 1100);
  } else {
    rating = Math.round(between(r, 6.3, 9.3) * 10) / 10;
    reviewCount = Math.round(Math.exp(between(r, Math.log(12), Math.log(900))));
  }
  const issue: IssueProfile =
    reviewCount < 8
      ? 'none'
      : weighted(r, [
          ['none', 0.62],
          ['mold', 0.08],
          ['noise', 0.1],
          ['dirty', 0.07],
          ['condition', 0.05],
          ['smell', 0.03],
          ['photos', 0.03],
          ['bugs', 0.02],
        ] as const);
  const facilityIds = FAKE_FACILITIES.filter((f) => {
    const base = { 1: 0.8, 2: 0.9, 3: 0.35, 4: 0.3, 5: 0.25, 6: 0.1, 7: 0.2, 8: 0.35, 17: 0.6 }[f.id] ?? 0.3;
    const boost = (kind === 'Apartments' || kind === 'Ferienwohnung') && f.id === 6 ? 1 : 0;
    return r() < base + boost;
  }).map((f) => f.id);
  const rooms = roomsFor(kind, r);
  if (rooms.some((room) => room.code === 'FAM') && !facilityIds.includes(8)) facilityIds.push(8);
  facilityIds.sort((a, b) => a - b);
  const boards: Array<'RO' | 'BB' | 'HB'> =
    kind === 'Apartments' || kind === 'Ferienwohnung' ? ['RO'] : r() < 0.4 ? ['BB', 'HB'] : ['BB'];
  const offsetKm = between(r, 0.2, 6);
  const angle = between(r, 0, Math.PI * 2);
  const lat = latE2 / 100 + (offsetKm / 111) * Math.cos(angle);
  const lng = lngE2 / 100 + (offsetKm / (111 * Math.cos((latE2 / 100) * (Math.PI / 180)))) * Math.sin(angle);
  return {
    id: hotelId(latE2, lngE2, index),
    name,
    kind,
    stars,
    rating,
    reviewCount,
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
    address: `${pick(r, STREETS)} ${intBetween(r, 1, 48)}`,
    basePerNightCents: Math.round(basePriceEur(kind, stars, r) * qualityPriceFactor(rating) * 100),
    cityTaxCentsPerPersonNight: r() < 0.6 ? intBetween(r, 15, 35) * 10 : 0,
    taxesKnown: r() >= 0.15,
    facilityIds,
    photo: `/fake/hotel-${intBetween(r, 1, 8)}.svg`,
    rooms,
    boards,
    nonRefundableOffered: r() < 0.7,
    issue,
    availability: between(r, 0.8, 0.97),
  };
}

export function hotelsAt(lat: number, lng: number): FakeHotel[] {
  const { latE2, lngE2 } = anchorOf(lat, lng);
  return Array.from({ length: hotelCountAt(latE2, lngE2) }, (_, i) => generateHotel(latE2, lngE2, i));
}

export function hotelById(id: string): FakeHotel | null {
  const parsed = parseHotelId(id);
  if (!parsed || parsed.index >= hotelCountAt(parsed.latE2, parsed.lngE2)) return null;
  return generateHotel(parsed.latE2, parsed.lngE2, parsed.index);
}

// ---------------------------------------------------------------- prices --

const SEASON = [1.05, 1.1, 0.95, 0.95, 1.0, 1.08, 1.25, 1.3, 1.1, 1.05, 0.85, 1.1];

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(checkin: string, checkout: string): number {
  return Math.round((Date.parse(`${checkout}T00:00:00Z`) - Date.parse(`${checkin}T00:00:00Z`)) / 86_400_000);
}

function nightFactor(date: string): number {
  const d = new Date(`${date}T00:00:00Z`);
  const month = d.getUTCMonth();
  const md = date.slice(5);
  const holiday = md >= '12-22' || md <= '01-06';
  const weekday = d.getUTCDay(); // 5 = Friday night, 6 = Saturday night
  return (SEASON[month] ?? 1) * (holiday ? 1.35 : 1) * (weekday === 5 || weekday === 6 ? 1.15 : 0.95);
}

export interface FakeOccupancy {
  adults: number;
  children: number[];
}

function occupancyFactor(o: FakeOccupancy): number {
  const adults = o.adults <= 1 ? 0.8 : o.adults === 2 ? 1 : o.adults === 3 ? 1.35 : 1.6 + (o.adults - 4) * 0.3;
  return adults + o.children.filter((age) => age >= 6).length * 0.15;
}

/** Deal dates: this hotel is markedly cheaper on this check-in date. */
export function isDealDate(hotel: FakeHotel, checkin: string): boolean {
  return hashString(`deal|${hotel.id}|${checkin}`) % 9 === 0;
}

export function isAvailable(hotel: FakeHotel, checkin: string, checkout: string): boolean {
  return seeded('avail', hotel.id, checkin, checkout)() < hotel.availability;
}

export interface FakeOffer {
  h: string;
  ci: string;
  co: string;
  o: FakeOccupancy[];
  r: string;
  b: 'RO' | 'BB' | 'HB';
  rf: boolean;
  t: number;
  c: string;
}

export function encodeOffer(offer: FakeOffer): string {
  return base64UrlEncode(offer);
}

export function decodeOffer(offerId: string): FakeOffer | null {
  try {
    return base64UrlDecode<FakeOffer>(offerId);
  } catch {
    return null;
  }
}

export interface PricedOffer extends FakeOffer {
  room: FakeRoom;
  perNightCents: number[];
  cityTaxCents: number;
  firstNightCents: number;
}

export function offersFor(
  hotel: FakeHotel,
  checkin: string,
  checkout: string,
  occupancies: FakeOccupancy[],
  currency: string,
): PricedOffer[] {
  if (!isAvailable(hotel, checkin, checkout)) return [];
  const nights = nightsBetween(checkin, checkout);
  const deal = isDealDate(hotel, checkin) ? 0.68 : 1;
  const offers: PricedOffer[] = [];
  for (const room of hotel.rooms) {
    if (occupancies.some((o) => o.adults + o.children.length > room.maxOccupancy)) continue;
    if (seeded('room', hotel.id, room.code, checkin)() < 0.12) continue;
    const perNight = Array.from({ length: nights }, (_, i) => {
      const date = addDays(checkin, i);
      const noise = between(seeded('noise', hotel.id, date), 0.92, 1.08);
      const occ = occupancies.reduce((sum, o) => sum + occupancyFactor(o), 0);
      return Math.round(hotel.basePerNightCents * room.factor * nightFactor(date) * noise * occ * deal);
    });
    const persons = occupancies.reduce((s, o) => s + o.adults, 0);
    for (const board of hotel.boards) {
      const boardExtra = board === 'HB' ? 2400 * persons : 0;
      const nightsCents = perNight.map((p) => p + boardExtra);
      const refundableTotal = nightsCents.reduce((a, b) => a + b, 0);
      const variants: Array<[boolean, number]> = [[true, refundableTotal]];
      if (hotel.nonRefundableOffered) variants.push([false, Math.round(refundableTotal * 0.9)]);
      for (const [refundable, total] of variants) {
        offers.push({
          h: hotel.id,
          ci: checkin,
          co: checkout,
          o: occupancies,
          r: room.code,
          b: board,
          rf: refundable,
          t: total,
          c: currency,
          room,
          perNightCents: nightsCents,
          cityTaxCents: hotel.cityTaxCentsPerPersonNight * persons * nights,
          firstNightCents: nightsCents[0] ?? 0,
        });
      }
    }
  }
  return offers.sort((a, b) => a.t - b.t).slice(0, 4);
}

// --------------------------------------------------------------- reviews --

export interface FakeReview {
  averageScore: number;
  date: string;
  language: string;
  name: string;
  headline: string;
  pros: string;
  cons: string;
}

const PROS_DE = [
  'Sehr freundliches Personal und ein reichhaltiges Frühstück.',
  'Tolle Lage, ideal als Ausgangspunkt für Wanderungen.',
  'Das Zimmer war gemütlich und ruhig.',
  'Super Aussicht vom Balkon, wir kommen wieder.',
  'Absolut sauber, kein Schimmel, alles top gepflegt.',
  'Gute Betten, sehr ruhige Nächte.',
  'Preis-Leistung stimmt.',
  'Kostenlose Parkplätze direkt am Haus.',
];
const PROS_EN = ['Great location and very friendly staff.', 'Clean room and a lovely breakfast.', 'Quiet at night, comfortable beds.'];
const CONS_DE = ['Das WLAN war etwas langsam.', 'Parkplätze waren knapp.', 'Frühstück hätte etwas mehr Auswahl haben können.', 'Nichts zu bemängeln.', 'Etwas hellhörig, aber nicht laut.'];
const CONS_EN = ['Wifi was a bit slow.', 'Nothing to complain about.'];

const ISSUE_CONS: Record<Exclude<IssueProfile, 'none'>, string[]> = {
  mold: ['Leider Schimmel an der Duschfuge.', 'Im Bad war Schimmel an der Decke, das war unschön.', 'Schwarzer Schimmel hinter dem Duschvorhang.'],
  noise: ['Das Zimmer zur Straße war sehr laut.', 'Nachts Lärm von der Bar nebenan.', 'Sehr hellhörig, die Nachbarn waren laut zu hören.'],
  dirty: ['Das Bad war nicht sauber.', 'Staub unter dem Bett und Haare im Waschbecken.', 'Die Handtücher waren fleckig und schmutzig.'],
  bugs: ['Wir hatten Bettwanzen im Zimmer!', 'Am zweiten Tag Ungeziefer im Bad entdeckt.'],
  smell: ['Muffiger Geruch im ganzen Zimmer.', 'Es roch stark nach Rauch, obwohl Nichtraucherzimmer.'],
  condition: ['Das Zimmer ist stark renovierungsbedürftig.', 'Möbel abgenutzt, Teppich durchgelaufen.'],
  photos: ['Das Zimmer sah ganz anders aus als auf den Fotos.', 'Die Bilder im Internet sind deutlich älter als die Realität.'],
};

const FIRST_NAMES = ['Anna', 'Jonas', 'Mia', 'Lukas', 'Lea', 'Paul', 'Sophie', 'Felix', 'Emma', 'Max'];

/**
 * Reviews for a hotel, newest first, relative to `today`. Hotels with an
 * issue profile get recurring complaints, three of them within the last six
 * months (review check, konzept.md 5.1 example 4).
 */
export function reviewsFor(hotel: FakeHotel, today: string, limit: number): FakeReview[] {
  const count = Math.min(hotel.reviewCount, limit);
  const r = seeded('reviews', hotel.id);
  const reviews: FakeReview[] = [];
  const issueSlots = hotel.issue === 'none' ? new Set<number>() : new Set([0, 2, 4, 9]);
  for (let i = 0; i < count; i += 1) {
    // Newest first: spread over roughly 24 months, denser in recent months.
    const ageDays = Math.round(Math.pow(i / Math.max(count, 1), 1.3) * 700 + between(r, 1, 12));
    const date = addDays(today, -ageDays);
    const english = r() < 0.2;
    const base = hotel.rating ?? 8;
    const issueHere = issueSlots.has(i) && hotel.issue !== 'none' && (i < 5 ? ageDays < 180 : true);
    const score = Math.max(1, Math.min(10, Math.round((base + between(r, -1.2, 1.0) - (issueHere ? 2.5 : 0)) * 10) / 10));
    const cons = issueHere
      ? pick(r, ISSUE_CONS[hotel.issue as Exclude<IssueProfile, 'none'>])
      : english
        ? pick(r, CONS_EN)
        : pick(r, CONS_DE);
    reviews.push({
      averageScore: score,
      date: `${date} 10:00:00`,
      language: english ? 'en' : 'de',
      name: pick(r, FIRST_NAMES),
      headline: score >= 8.5 ? (english ? 'Wonderful stay' : 'Wunderbarer Aufenthalt') : score >= 7 ? (english ? 'Good' : 'Gut') : english ? 'Disappointing' : 'Enttäuschend',
      pros: english ? pick(r, PROS_EN) : pick(r, PROS_DE),
      cons,
    });
  }
  return reviews;
}

export function sentimentFor(hotel: FakeHotel): Array<{ name: string; rating: number }> {
  const r = seeded('sentiment', hotel.id);
  const base = hotel.rating ?? 8;
  const cleanliness = base - (hotel.issue === 'dirty' || hotel.issue === 'mold' ? 1.6 : 0) + between(r, -0.4, 0.4);
  const clamp = (v: number) => Math.round(Math.max(1, Math.min(10, v)) * 10) / 10;
  return [
    { name: 'Cleanliness', rating: clamp(cleanliness) },
    { name: 'Service', rating: clamp(base + between(r, -0.5, 0.5)) },
    { name: 'Location', rating: clamp(base + between(r, -0.2, 0.8)) },
    { name: 'Room', rating: clamp(base - (hotel.issue === 'condition' ? 1.5 : 0) + between(r, -0.5, 0.3)) },
    { name: 'Value for money', rating: clamp(base + between(r, -0.6, 0.4)) },
  ];
}
