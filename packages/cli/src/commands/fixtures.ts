// `npm run cli -- fixtures verify`: every provider fixture parses against the
// zod schemas and contains no e-mail addresses or reviewer names.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';
import { z } from 'zod';

const schemas: Record<string, z.ZodType> = {};

async function loadSchemas() {
  const liteapi = await import('../../../providers/src/liteapi/schemas');
  schemas['liteapi/rates.json'] = liteapi.ratesResponseSchema;
  schemas['liteapi/reviews.json'] = liteapi.reviewsResponseSchema;
  schemas['liteapi/prebook.json'] = liteapi.prebookResponseSchema;
  schemas['liteapi/book.json'] = liteapi.bookResponseSchema;
  schemas['ors/matrix.json'] = z.object({ durations: z.array(z.array(z.number().nullable())) });
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export async function fixturesCommand(args: string[], log: (line: string) => void): Promise<number> {
  if (args[0] !== 'verify') {
    log('usage: fixtures verify');
    return 2;
  }
  await loadSchemas();
  const dir = resolve(repoRoot, 'packages/providers/fixtures');
  let problems = 0;
  for (const provider of readdirSync(dir).filter((d) => !d.includes('.'))) {
    for (const file of readdirSync(join(dir, provider))) {
      const key = `${provider}/${file}`;
      const text = readFileSync(join(dir, provider, file), 'utf8');
      const schema = schemas[key];
      const parsed = schema ? schema.safeParse(JSON.parse(text)) : null;
      const email = EMAIL.exec(text);
      const json = JSON.parse(text) as { data?: unknown };
      const reviewNames =
        key.includes('reviews') && Array.isArray(json.data)
          ? (json.data as Array<{ name?: unknown }>).map((r) => r.name).filter((n) => n !== undefined && n !== 'REDACTED')
          : [];
      const ok = (parsed?.success ?? false) && !email && reviewNames.length === 0;
      if (!ok) problems += 1;
      log(
        `${ok ? 'ok  ' : 'FAIL'} ${key}${schema ? '' : ' (no schema registered)'}${parsed && !parsed.success ? ' schema mismatch' : ''}` +
          `${email ? ' contains an e-mail address' : ''}${reviewNames.length ? ' contains reviewer names' : ''}`,
      );
    }
  }
  log(problems ? `${problems} fixture(s) failed` : 'all fixtures valid, no personal data found');
  return problems ? 1 : 0;
}
