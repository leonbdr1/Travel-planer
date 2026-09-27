// Runs pgTAP test scripts (supabase/tests/*.sql) against PGlite and parses
// the TAP output. Used by `npm run db:test` and by the Vitest suite.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';

export interface TapFileResult {
  file: string;
  planned: number | null;
  passed: number;
  failed: number;
  lines: string[];
  error?: string;
  ok: boolean;
}

export function listPgtapFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join(dir, f));
}

function collectLines(results: Array<{ rows: Array<Record<string, unknown>> }>): string[] {
  const lines: string[] = [];
  for (const result of results) {
    for (const row of result.rows) {
      for (const value of Object.values(row)) {
        if (typeof value === 'string') lines.push(...value.split('\n'));
      }
    }
  }
  return lines;
}

export async function runPgtapFile(pg: PGlite, file: string): Promise<TapFileResult> {
  const name = basename(file);
  try {
    const results = await pg.exec(readFileSync(file, 'utf8'));
    const lines = collectLines(results);
    const planLine = lines.find((l) => /^1\.\.\d+$/.test(l));
    const planned = planLine ? Number(planLine.slice(3)) : null;
    const passed = lines.filter((l) => /^ok \d+/.test(l)).length;
    const failed = lines.filter((l) => /^not ok \d+/.test(l)).length;
    return { file: name, planned, passed, failed, lines, ok: failed === 0 && planned === passed };
  } catch (err) {
    await pg.exec('ROLLBACK;').catch(() => {});
    return { file: name, planned: null, passed: 0, failed: 1, lines: [], error: (err as Error).message, ok: false };
  }
}
