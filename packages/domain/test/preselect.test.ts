// Goal, automatic pre-selection and finale (konzept.md 9.9, 9.10, F16).
import { describe, expect, it } from 'vitest';
import { CANDIDATE_QUALITY_MARGIN, GOAL_QUALITY_FLOOR } from '../src/constants';
import { compareFinalists, locationClass, type FinalistInput } from '../src/finale';
import { admissibleHotelIds, finalistIdsAcrossGoals, preselect, reviewCandidateIds, unratedDoubts, type HotelEvidence, type PreselectHotel, type WarningEvidence } from '../src/preselect';
import type { EvaluatedOffer } from '../src/ranking';
import { qualityScore } from '../src/scoring';
import type { Goal } from '../src/vocabulary';

const NIGHTS = 2;
const place = { lat: 47.5703, lng: 10.7003 };

function offer(hotelId: string, totalEur: number, quality: number | null, extra: Partial<EvaluatedOffer> = {}): EvaluatedOffer {
  const totalCents = totalEur * 100;
  return {
    id: `o-${hotelId}`,
    hotelId,
    placeId: 'P1',
    placeName: 'Füssen',
    checkin: '2026-10-09',
    checkout: '2026-10-11',
    kind: 'cheapest',
    offerId: `x-${hotelId}`,
    roomName: 'Doppelzimmer',
    boardType: 'RO',
    refundable: true,
    freeCancelUntil: null,
    totalCents,
    pricePerNightCents: totalCents / NIGHTS,
    payAtPropertyCents: 0,
    payAtPropertyKnown: true,
    currency: 'EUR',
    passes: true,
    oversized: false,
    quality,
    breakdown: qualityScore({ rating: quality, reviewCount: quality === null ? 0 : 200, review: null, chips: [] }),
    bargain: null,
    rankScore: quality === null ? 0 : quality / 10 - totalEur / 1000,
    ...extra,
  };
}

const house = (id: string, stars: number | null, facilityIds: number[] = []): PreselectHotel => ({ id, stars, facilityIds, hotelType: stars ? 'Hotel' : 'Ferienwohnung' });
const clean: HotelEvidence = { checked: true, warnings: [], labels: [] };
/** A confirmed complaint topic: `guests` of the checked guests, `share` of them weighted by age. */
const complaint = (topic: string, guests: number, share: number, verified = true): WarningEvidence => ({
  topic,
  confirmed: verified ? Math.min(guests, 5) : 0,
  unverified: verified ? 0 : Math.min(guests, 5),
  guests,
  share,
});

// Ben's example: "billig und sauber" → two flats remain, the customer decides about the sauna.
const offers = [
  offer('W1', 100, 8.4),
  offer('W2', 110, 8.3),
  offer('LUX', 300, 9.4),
  offer('DIRTY', 80, 7.8),
  offer('TRAP', 70, 7.2),
  offer('DOM', 120, 8.0),
  // No reviews and far below the usual price: looks like a fake listing.
  offer('NOREV', 60, null),
  offer('FILTERED', 60, 8.8, { passes: false }),
];
const hotels = new Map<string, PreselectHotel>([
  ['W1', house('W1', null)],
  ['W2', house('W2', null, [4])],
  ['LUX', house('LUX', 5, [4, 5, 18])],
  ['DIRTY', house('DIRTY', null)],
  ['TRAP', house('TRAP', 4)],
  ['DOM', house('DOM', null)],
  ['NOREV', house('NOREV', null)],
  ['FILTERED', house('FILTERED', 2)],
]);
const evidence = new Map<string, HotelEvidence>([
  ['W1', clean],
  ['W2', clean],
  ['LUX', clean],
  ['DIRTY', { checked: true, warnings: [complaint('sauberkeit', 9, 0.3)], labels: [] }],
  ['TRAP', { checked: true, warnings: [complaint('zustand', 2, 0.05)], labels: [] }],
  ['DOM', clean],
]);
const run = (goal: Goal, overrides: Partial<{ evaluated: EvaluatedOffer[]; evidence: Map<string, HotelEvidence> }> = {}) =>
  preselect({ goal, evaluated: overrides.evaluated ?? offers, hotels, evidence: overrides.evidence ?? evidence });

describe('preselect', () => {
  it('"Günstig und sauber": the program sorts out, two flats remain for the customer', () => {
    const result = run('sparen');
    expect(result.finalists.map((o) => o.hotelId)).toEqual(['W1', 'W2']);
    expect(result.excluded).toEqual({ filters: 1, no_reviews: 1, red_flag: 1, star_trap: 1, low_quality: 0, too_expensive: 1, dominated: 1 });
  });

  it('never lets stars raise quality: a 4-star house at a budget price needs checked good reviews', () => {
    const good = new Map(evidence).set('TRAP', clean);
    const withGoodScore = offers.map((o) => (o.hotelId === 'TRAP' ? { ...o, quality: 8.6 } : o));
    // Checked, 8.6, no condition complaints: a real bargain, and the cheapest clean house.
    expect(run('sparen', { evaluated: withGoodScore, evidence: good }).finalists[0]?.hotelId).toBe('TRAP');
    // Same score but never checked: stays out.
    const unchecked = new Map(good).set('TRAP', { checked: false, warnings: [], labels: [] });
    expect(run('sparen', { evaluated: withGoodScore, evidence: unchecked }).excluded.star_trap).toBe(1);
  });

  it('"Komfort" keeps the expensive house and raises the quality floor', () => {
    const result = run('komfort');
    expect(result.finalists.map((o) => o.hotelId)).toEqual(['W1', 'W2', 'LUX']);
    expect(result.excluded.low_quality).toBe(1);
    expect(result.excluded.too_expensive).toBe(0);
  });

  it('removes an offer that is dearer, not better and brings nothing more', () => {
    const result = run('ausgewogen');
    expect(result.finalists.map((o) => o.hotelId)).not.toContain('DOM');
    expect(result.excluded.dominated).toBeGreaterThanOrEqual(1);
  });

  it('takes a house out for mould, vermin or dirt only when complaints get out of hand (Ben, 2026-09-29)', () => {
    const warned = (w: WarningEvidence) => new Map(evidence).set('DIRTY', { checked: true, warnings: [w], labels: [] });
    // DIRTY is the cheapest house (80 €) and stays the first finalist unless flagged.
    const first = (e: Map<string, HotelEvidence>) => run('sparen', { evidence: e }).finalists[0]?.hotelId;
    // A few guests among many: a warning, the house is ranked like any other.
    expect(first(warned(complaint('schimmel', 3, 0.04)))).toBe('DIRTY');
    expect(first(warned(complaint('schimmel', 9, 0.09)))).toBe('DIRTY');
    // Out of hand: a tenth of the checked reviews (weighted) on mould or vermin.
    expect(first(warned(complaint('schimmel', 3, 0.1)))).toBe('W1');
    expect(first(warned(complaint('ungeziefer', 4, 0.25)))).toBe('W1');
    // Two guests are never enough, however small the house; keyword hits without AI need four.
    expect(first(warned(complaint('schimmel', 2, 0.4)))).toBe('DIRTY');
    expect(first(warned(complaint('schimmel', 3, 0.3, false)))).toBe('DIRTY');
    expect(first(warned(complaint('schimmel', 4, 0.3, false)))).toBe('W1');
    // Dirt: four guests and 15 %.
    expect(first(warned(complaint('sauberkeit', 4, 0.14)))).toBe('DIRTY');
    expect(first(warned(complaint('sauberkeit', 3, 0.3)))).toBe('DIRTY');
    expect(first(warned(complaint('sauberkeit', 4, 0.15)))).toBe('W1');
    // Noise is no red flag: it is shown as a warning, the traveller decides.
    expect(first(warned(complaint('laerm', 20, 0.5)))).toBe('DIRTY');
  });

  it('lists a house with a few mould reports like any other', () => {
    const fewReports = new Map(evidence).set('DIRTY', { checked: true, warnings: [complaint('schimmel', 3, 0.04)], labels: [] });
    const input = { goal: 'sparen' as const, evaluated: offers, hotels, evidence: fewReports };
    expect(admissibleHotelIds(input).has('DIRTY')).toBe(true);
    expect(preselect(input).excluded.red_flag).toBe(0);
    expect(admissibleHotelIds({ ...input, evidence }).has('DIRTY')).toBe(false);
  });

  it('keeps at most five finalists, one per house, and names the rest runners-up', () => {
    // Each house brings one feature the others lack, so none is dominated.
    const featureIds = [1, 3, 4, 6, 7, 8, 9, 16];
    const many = Array.from({ length: 8 }, (_, i) => offer(`H${i}`, 100 + i, 8.5, { rankScore: 1 - i / 100 }));
    const manyHotels = new Map(many.map((o, i) => [o.hotelId, house(o.hotelId, 3, [featureIds[i] ?? 1])]));
    const result = preselect({ goal: 'ausgewogen', evaluated: many, hotels: manyHotels, evidence: new Map() });
    expect(result.finalists).toHaveLength(5);
    expect(result.runnersUp).toHaveLength(3);
    expect(new Set(result.finalists.map((o) => o.hotelId)).size).toBe(5);
  });

  it('checks the likely finalists of every goal first, then the goal order without window and dominance', () => {
    const input = { goal: 'sparen' as const, evaluated: offers, hotels, evidence: new Map<string, HotelEvidence>() };
    // Likely finalists: "sparen" DIRTY, W1; "ausgewogen" adds W2; "komfort" adds LUX. Reserve in price order: DOM.
    expect(reviewCandidateIds(input, 5)).toEqual(['DIRTY', 'W1', 'W2', 'LUX', 'DOM']);
    // With a small budget the traveller's own goal comes first.
    expect(reviewCandidateIds(input, 2)).toEqual(['DIRTY', 'W1']);
    // Star-trap suspects with a weak score and houses without reviews are never checked.
    expect(reviewCandidateIds(input, 10)).not.toContain('TRAP');
    expect(reviewCandidateIds(input, 10)).not.toContain('NOREV');
  });

  it('prefers checked houses: unchecked ones only fill up, never push out a checked one, never set the price window', () => {
    // Four cheaper, better-rated houses without review check, each with one extra facility.
    const extras = [
      [1, 80],
      [3, 85],
      [7, 90],
      [8, 95],
    ] as const;
    // Without TRAP: the cheap extra houses would lower the star-trap reference price below its price.
    const withU = [...offers.filter((o) => o.hotelId !== 'TRAP'), ...extras.map(([, eur], i) => offer(`U${i + 1}`, eur, 8.8))];
    const hotelsU = new Map(hotels);
    extras.forEach(([facility], i) => hotelsU.set(`U${i + 1}`, house(`U${i + 1}`, null, [facility])));
    const result = preselect({ goal: 'sparen', evaluated: withU, hotels: hotelsU, evidence });
    // Window from W1 (100 €, the cheapest checked house), not from U1 (80 €): W2 (110 €) stays in.
    // W1 and W2 take their places first; three unchecked houses fill up, the last one waits.
    expect(result.finalists.map((o) => o.hotelId)).toEqual(['U1', 'U2', 'U3', 'W1', 'W2']);
    expect(result.runnersUp.map((o) => o.hotelId)).toEqual(['U4']);
    // Only DOM is dominated (by W1); the unchecked houses push no checked one out.
    expect(result.excluded.dominated).toBe(1);
  });

  it('lets a clearly cheaper checked house down to 6.5 in, but not for "Komfort"', () => {
    // Cheapest house meeting the 7.5 floor: W1 at 100 €. BUDGET (6.7) at 75 € is 25 % cheaper.
    // Without TRAP: a cheap BUDGET lowers the star-trap reference below TRAP's price.
    const withBudget = (eur: number, q = 6.7) => [...offers.filter((o) => o.hotelId !== 'TRAP'), offer('BUDGET', eur, q)];
    const hotelsB = new Map(hotels).set('BUDGET', house('BUDGET', null, [16]));
    const evidenceB = new Map(evidence).set('BUDGET', clean);
    const ids = (goal: Goal, list: EvaluatedOffer[], ev = evidenceB) => preselect({ goal, evaluated: list, hotels: hotelsB, evidence: ev }).finalists.map((o) => o.hotelId);
    expect(ids('ausgewogen', withBudget(75))).toContain('BUDGET');
    // Only 20 % cheaper, or below 6.5, or never checked, or "Komfort": out.
    expect(ids('ausgewogen', withBudget(80))).not.toContain('BUDGET');
    expect(ids('ausgewogen', withBudget(75, 6.4))).not.toContain('BUDGET');
    expect(ids('ausgewogen', withBudget(75), evidence)).not.toContain('BUDGET');
    expect(ids('komfort', withBudget(50))).not.toContain('BUDGET');
    // The exception does not move the price window: W2 (110 €) stays in.
    expect(ids('sparen', withBudget(60))).toEqual(['BUDGET', 'W1', 'W2']);
  });

  it('lets one house without reviews in when price and extras fit the picture, marked by its missing score', () => {
    // Rated flats cost 40–60 € per night (median 52.50 €); 80 % of that is 42 €.
    const fresh = (id: string, eur: number) => offer(id, eur, null);
    const hotelsN = new Map(hotels).set('NEW1', house('NEW1', null, [16])).set('NEW2', house('NEW2', null, [9])).set('SPA', house('SPA', null, [4, 18]));
    const ids = (goal: Goal, extra: EvaluatedOffer[]) =>
      preselect({ goal, evaluated: [...offers, ...extra], hotels: hotelsN, evidence }).finalists.map((o) => o.hotelId);
    expect(ids('sparen', [fresh('NEW1', 104)])).toEqual(['W1', 'NEW1', 'W2']);
    // Too cheap for its kind: out.
    expect(ids('sparen', [fresh('NEW1', 80)])).toEqual(['W1', 'W2']);
    // Below the usual price with sauna and pool that hardly any rated house offers: out.
    expect(ids('sparen', [fresh('SPA', 100)])).toEqual(['W1', 'W2']);
    // At most one, and never for "Komfort".
    expect(ids('sparen', [fresh('NEW1', 104), fresh('NEW2', 106)])).toHaveLength(3);
    expect(ids('komfort', [fresh('NEW1', 104)])).not.toContain('NEW1');
  });

  it('names why a house without reviews is sorted out, so the list can show it apart (Ben, 2026-09-29)', () => {
    const fresh = (id: string, eur: number) => offer(id, eur, null);
    const hotelsN = new Map(hotels).set('NEW1', house('NEW1', null, [16])).set('SPA', house('SPA', null, [4, 18]));
    const doubts = (goal: Goal, extra: EvaluatedOffer[], only?: EvaluatedOffer[]) =>
      Object.fromEntries(unratedDoubts({ goal, evaluated: only ?? [...offers, ...extra], hotels: hotelsN, evidence }));
    // Rated flats W1, W2, DIRTY, DOM without stars: median 52.50 € per night.
    expect(doubts('sparen', [fresh('NEW1', 80), fresh('SPA', 100)])).toEqual({
      NOREV: { code: 'cheap', referencePerNightCents: 5250 },
      NEW1: { code: 'cheap', referencePerNightCents: 5250 },
      SPA: { code: 'extras', referencePerNightCents: 5250 },
    });
    // A plausible one is in the normal list (and may reach the finale), not among the doubts.
    expect(doubts('sparen', [fresh('NEW1', 104)])).not.toHaveProperty('NEW1');
    expect(doubts('komfort', [fresh('NEW1', 104)]).NEW1).toEqual({ code: 'goal', referencePerNightCents: null });
    // Without enough rated houses nothing can be compared.
    expect(doubts('sparen', [], [offer('W1', 100, 8.4), fresh('NEW1', 104)])).toEqual({ NEW1: { code: 'no_reference', referencePerNightCents: null } });
    // Doubts never change the finale or the recommendation.
    const result = preselect({ goal: 'sparen', evaluated: [...offers, fresh('NEW1', 80), fresh('SPA', 100)], hotels: hotelsN, evidence });
    expect(result.finalists.map((o) => o.hotelId)).toEqual(['W1', 'W2']);
    expect(result.excluded.no_reviews).toBe(3);
  });

  it('lists the finalists of every goal once, for the follow-up round of the review check', () => {
    const input = { goal: 'komfort' as const, evaluated: offers, hotels, evidence };
    // With the evidence known: DIRTY is out (red flag); "komfort" first.
    expect(finalistIdsAcrossGoals(input)).toEqual(['W1', 'W2', 'LUX']);
  });

  it('keeps review-check candidates somewhat below the floor, because recent reviews can still lift them', () => {
    const floor = GOAL_QUALITY_FLOOR.komfort;
    const near = [offer('A', 100, floor - CANDIDATE_QUALITY_MARGIN / 2), offer('B', 110, floor - CANDIDATE_QUALITY_MARGIN * 2)];
    const nearHotels = new Map([
      ['A', house('A', 3)],
      ['B', house('B', 3)],
    ]);
    const input = { goal: 'komfort' as const, evaluated: near, hotels: nearHotels, evidence: new Map<string, HotelEvidence>() };
    expect(reviewCandidateIds(input, 5)).toEqual(['A']);
    expect(preselect(input).finalists).toEqual([]);
    expect(preselect(input).excluded.low_quality).toBe(2);
  });
});

describe('finale', () => {
  const input = (id: string, extra: Partial<FinalistInput> = {}): FinalistInput => {
    const o = offers.find((x) => x.hotelId === id) as EvaluatedOffer;
    const h = hotels.get(id) as PreselectHotel;
    return { offer: o, hotel: { ...h, location: { lat: 47.5712, lng: 10.7011 } }, place, labels: [], ...extra };
  };

  it('shows the surcharge and what it brings, without a recommendation', () => {
    const [cheap, sauna] = compareFinalists([input('W1'), input('W2', { labels: ['fruehstueck'] })]);
    expect(cheap?.priceDeltaCents).toBe(0);
    expect(cheap?.gains).toEqual([]);
    expect(sauna?.priceDeltaCents).toBe(1000);
    expect(sauna?.gains.map((g) => g.label)).toEqual(['Sauna oder Wellness', 'Gutes Frühstück']);
    expect(sauna?.losses).toEqual([]);
    expect(sauna?.qualityDelta).toBeNull();
  });

  it('names what the dearer one lacks, other place or dates and a clear quality gap', () => {
    const nonRefundable = { ...offers.find((o) => o.hotelId === 'LUX'), refundable: false, placeId: 'P2', checkin: '2026-10-02' } as EvaluatedOffer;
    const [, lux] = compareFinalists([input('W1'), input('LUX', { offer: nonRefundable, hotel: { ...hotels.get('LUX')!, location: { lat: 47.6, lng: 10.75 } } })]);
    expect(lux?.gains.map((g) => g.code)).toEqual(['sauna_wellness', 'schwimmbad']);
    // The flat can be cancelled for free, lies in the centre and has a kitchen (holiday flat),
    // the hotel room not; the more decisive difference first.
    expect(lux?.losses.map((g) => g.label)).toEqual(['kostenlos stornierbar', 'Ortskern', 'Küche']);
    expect(lux?.qualityDelta).toBe(1);
    expect(lux?.otherPlace).toBe(true);
    expect(lux?.otherDates).toBe(true);
    expect(lux?.location).toBe('ausserhalb');
  });

  it('compares walking distances from OpenStreetMap: whether is the difference, how far the label', () => {
    const facts = (lift: number | null, bus: number | null, gastro = 0) => ({ walk: { lift, bahn: null, bus, supermarkt: null }, gastro });
    const withFacts = (id: string, f: ReturnType<typeof facts>) => input(id, { hotel: { ...hotels.get(id)!, location: { lat: 47.5712, lng: 10.7011 }, facts: f } });
    const [base, near] = compareFinalists([withFacts('W1', facts(null, 3, 5)), withFacts('W2', facts(2, 6))]);
    expect(base?.features.map((f) => f.label)).toContain('3 min zur Bushaltestelle');
    expect(near?.gains.map((g) => g.label)).toContain('2 min zum Lift');
    // Both near a bus stop: no gain or loss, each shows its own minutes.
    expect(near?.features.map((f) => f.label)).toContain('6 min zur Bushaltestelle');
    expect(near?.losses.map((g) => g.label)).toEqual(['Restaurants in der Nähe']);
  });

  it('classifies the distance to the town centre', () => {
    expect(locationClass(0.3)).toBe('kern');
    expect(locationClass(1.5)).toBe('ort');
    expect(locationClass(4)).toBe('ausserhalb');
    expect(locationClass(null)).toBeNull();
  });
});
