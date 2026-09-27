// S5.2 demo over HTTP against the real local stack: 202 with search_id and
// token, 400 without a valid ALTCHA, 429 with Retry-After on the 11th search
// of one client within an hour, 402 {reason:"quota"} once today's search quota
// is used up (the demo books the quota up to the cap directly in the ledger).
import { productConfig } from '@reiseplaner/config';
import { seedDevData } from '../seed';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { catalogPlaceIds, demoSearchRequest } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  const window = { start: '2026-10-01', end: '2026-10-19' };
  const post = (body: unknown, ip: string) =>
    fetch(`${stack.baseUrl}/api/v1/searches`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
      body: JSON.stringify(body),
    });
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Oberstdorf', 'Füssen']);
    const first = await post(demoSearchRequest(places, window, await altchaPayload(stack.baseUrl)), '198.51.100.20');
    const created = (await first.json()) as { search_id: string; token: string };
    out.log(`POST /searches (gültiges ALTCHA) → HTTP ${first.status}: search_id ${created.search_id}, token ${created.token.length} Zeichen`);

    const forged = await post(demoSearchRequest(places, window, Buffer.from('{"challenge":{}}').toString('base64')), '198.51.100.21');
    out.log(`POST /searches ohne gültiges ALTCHA → HTTP ${forged.status}: ${JSON.stringify(await forged.json())}`);

    let status429 = 0;
    let retryAfter: string | null = null;
    for (let i = 1; i <= 11; i += 1) {
      const res = await post(demoSearchRequest(places, window, await altchaPayload(stack.baseUrl)), '198.51.100.22');
      if (i === 11) {
        status429 = res.status;
        retryAfter = res.headers.get('retry-after');
      }
      await res.body?.cancel();
    }
    out.log(`11. Suche derselben IP innerhalb einer Stunde → HTTP ${status429}, Retry-After ${retryAfter}`);

    const cap = productConfig.limits.daily_quotas.searches;
    await stack.db.db.query(
      `INSERT INTO app.budget_ledger (day, scope, reserved, settled, cap) VALUES ((now() AT TIME ZONE 'UTC')::date, 'searches', $1, 0, $1)
       ON CONFLICT (day, scope) DO UPDATE SET reserved = $1`,
      [cap],
    );
    out.log(`Tageskontingent „searches“ im Ledger auf ${cap} von ${cap} gesetzt`);
    const quota = await post(demoSearchRequest(places, window, await altchaPayload(stack.baseUrl)), '198.51.100.23');
    out.log(`POST /searches bei erschöpftem Kontingent → HTTP ${quota.status}: ${JSON.stringify(await quota.json())}`);

    const ok = first.status === 202 && forged.status === 400 && status429 === 429 && retryAfter === '3600' && quota.status === 402;
    out.log(ok ? '→ 202, 400 ohne ALTCHA, 429 mit Retry-After, 402 bei erschöpftem Kontingent' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
