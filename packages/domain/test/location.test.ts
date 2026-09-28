// Location facts (S11.5): walking minutes to the nearest stop, lift or shop,
// restaurants close by.
import { describe, expect, it } from 'vitest';
import { constants, hasGastroNearby, locationFacts, walkMinutes, type Poi } from '../src';

const house = { lat: 47.4, lng: 10.28 };
/** A point `meters` north of the house. */
const north = (meters: number) => ({ lat: house.lat + meters / 111_195, lng: house.lng });
const poi = (kind: Poi['kind'], meters: number): Poi => ({ kind, ...north(meters) });

describe('locationFacts', () => {
  it('turns straight-line meters into walking minutes with a detour', () => {
    expect(walkMinutes(0)).toBe(1);
    // 400 m × 1.3 / 80 m per minute = 6.5 → 7 minutes.
    expect(walkMinutes(400)).toBe(7);
  });

  it('takes the nearest one per kind and drops what is beyond its walking limit', () => {
    const facts = locationFacts(house, [poi('bus', 600), poi('bus', 200), poi('lift', 2000), poi('supermarkt', 300)]);
    expect(facts.walk).toEqual({ lift: null, bahn: null, bus: walkMinutes(200), supermarkt: walkMinutes(300) });
    const limit = constants.LOCATION_MAX_WALK_MIN.bus;
    const justOver = ((limit + 1) * constants.WALK_METERS_PER_MIN) / constants.WALK_DETOUR_FACTOR;
    expect(locationFacts(house, [poi('bus', justOver)]).walk.bus).toBeNull();
  });

  it('counts restaurants within the radius', () => {
    const r = constants.LOCATION_GASTRO_RADIUS_M;
    const facts = locationFacts(house, [poi('gastro', 50), poi('gastro', r - 10), poi('gastro', r + 50)]);
    expect(facts.gastro).toBe(2);
    expect(hasGastroNearby(facts)).toBe(false);
    expect(hasGastroNearby(locationFacts(house, [poi('gastro', 10), poi('gastro', 20), poi('gastro', 30)]))).toBe(true);
  });
});
