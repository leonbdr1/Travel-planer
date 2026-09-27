import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { countLocalities, matchLocality, searchLocalities } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { importGeoNames } from '../src/geonames/import';
import { parseDumpLine } from '../src/geonames/parse';

const sample = resolve(import.meta.dirname, 'fixtures/geonames-sample');
let test: TestDb;

beforeAll(async () => {
  test = await createTestDb();
});
afterAll(async () => test.close());

describe('GeoNames import', () => {
  it('parses dump lines', () => {
    const row = parseDumpLine('2825297\tStuttgart\tStuttgart\t\t48.78232\t9.17702\tP\tPPLA\tDE\t\t01\t\t08111\t08111000\t589793\t\t\tEurope/Berlin\t');
    expect(row).toMatchObject({ geonameid: 2825297, name: 'Stuttgart', countryCode: 'DE', admin1: '01', population: 589793 });
    expect(parseDumpLine('garbage')).toBeNull();
  });

  it('imports the market only, idempotently, with German names and postal codes', async () => {
    const first = await importGeoNames(test.db, sample);
    expect(first.byCountry).toEqual({ DE: 3, AT: 2, CH: 1, 'IT-BZ': 2 });
    expect(first.postalCodesAssigned).toBe(3);
    expect(first.postalCodesUnmatched).toBe(1);
    const second = await importGeoNames(test.db, sample);
    expect(second.byCountry).toEqual(first.byCountry);
    expect(await countLocalities(test.db)).toEqual({ AT: 2, CH: 1, DE: 3, 'IT-BZ': 2 });
  });

  it('finds localities by prefix, German name, umlaut variants and postal code', async () => {
    expect((await searchLocalities(test.db, 'Oberstd', 5))[0]).toMatchObject({
      displayName: 'Oberstdorf',
      adminName: 'Bayern',
      countryCode: 'DE',
    });
    expect((await searchLocalities(test.db, 'Stutt', 5))[0]?.geonameid).toBe(2825297);
    expect((await searchLocalities(test.db, 'Meran', 5))[0]).toMatchObject({ name: 'Merano', displayName: 'Meran', adminName: 'Südtirol' });
    expect((await searchLocalities(test.db, 'Fuessen', 5))[0]?.name).toBe('Füssen');
    expect((await searchLocalities(test.db, 'fussen', 5))[0]?.name).toBe('Füssen');
    expect((await searchLocalities(test.db, '87561', 5))[0]?.name).toBe('Oberstdorf');
    expect(await searchLocalities(test.db, 'x', 5)).toEqual([]);
    expect(await searchLocalities(test.db, 'Trento', 5)).toEqual([]);
  });

  it('matches catalog names deterministically within country and state', async () => {
    expect((await matchLocality(test.db, 'Oberstdorf', 'DE', '02'))?.exact).toBe(true);
    expect((await matchLocality(test.db, 'Bozen', 'IT-BZ', null))?.locality.name).toBe('Bolzano');
    expect(await matchLocality(test.db, 'Oberstdorf', 'AT', null)).toBeNull();
    expect((await matchLocality(test.db, 'Oberstorf', 'DE', null))?.exact).toBe(false);
  });
});
