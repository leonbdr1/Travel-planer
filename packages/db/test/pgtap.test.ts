import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listPgtapFiles, runPgtapFile } from '../src/pgtap';
import { pgtapDir } from '../src/migrate';
import { createTestDb, type TestDb } from '../src/testing';

let test: TestDb;
beforeAll(async () => {
  test = await createTestDb();
  await test.pg.exec('CREATE EXTENSION IF NOT EXISTS pgtap;');
});
afterAll(async () => test.close());

describe('pgTAP suites', () => {
  for (const file of listPgtapFiles(pgtapDir)) {
    it(`${file.split('/').pop()} passes`, async () => {
      const result = await runPgtapFile(test.pg, file);
      expect(result.error).toBeUndefined();
      expect(result.lines.filter((l) => l.startsWith('not ok'))).toEqual([]);
      expect(result.ok).toBe(true);
    });
  }

  it('the RLS baseline catches a table without RLS (mutation check)', async () => {
    const leaky = await createTestDb();
    try {
      await leaky.pg.exec('CREATE EXTENSION IF NOT EXISTS pgtap; CREATE TABLE app.leaky (id int);');
      const result = await runPgtapFile(leaky.pg, `${pgtapDir}/rls_baseline.sql`);
      expect(result.ok).toBe(false);
      expect(result.lines.some((l) => l.startsWith('not ok 1'))).toBe(true);
    } finally {
      await leaky.close();
    }
  });
});
