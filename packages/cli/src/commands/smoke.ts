// Smoke test after a deploy (S10.1): read-only checks, allowed against
// production as well. Health, API security headers, start page with its
// security headers, one immutable asset, /meta/config (optionally against
// the expected environment) and one autocomplete. Every check reports its
// own result; a network error fails the check, not the run.
import { productConfig } from '@reiseplaner/config';
import { healthResponseSchema, localitiesResponseSchema, metaConfigResponseSchema } from '@reiseplaner/contracts';
import { apiSecurityHeaders, spaSecurityHeaders } from '@reiseplaner/worker/security-headers';

export interface SmokeCheck {
  name: string;
  ok: boolean;
  detail: string;
}
export type SmokeFetch = (url: string, init?: RequestInit) => Promise<Response>;
export type SmokeEnv = 'staging' | 'production';

const REQUEST_TIMEOUT_MS = 15_000;
/** A town every catalog market knows; the autocomplete must find it. */
const SMOKE_LOCALITY = 'Stuttgart';

function headerMismatches(res: Response, expected: Readonly<Record<string, string>>): string[] {
  return Object.entries(expected)
    .filter(([name, value]) => res.headers.get(name) !== value)
    .map(([name]) => name);
}

/** What /meta/config must say in the given environment. */
function environmentProblems(meta: ReturnType<typeof metaConfigResponseSchema.parse>, env: SmokeEnv): string[] {
  const problems: string[] = [];
  if (meta.app_env !== env) problems.push(`app_env ${meta.app_env}`);
  const providers = env === 'production' ? 'live' : 'sandbox';
  if (meta.providers_mode !== providers) problems.push(`providers_mode ${meta.providers_mode} statt ${providers}`);
  if (env === 'production' && meta.payment_mode !== 'live') problems.push(`payment_mode ${meta.payment_mode} statt live`);
  if (env === 'production' && meta.catalog_drafts) problems.push('Katalog-Entwürfe sichtbar');
  const simulated = Object.entries(meta.provider_sources).filter(([, source]) => source === 'fake').map(([name]) => name);
  if (simulated.length) problems.push(`simuliert: ${simulated.join(', ')}`);
  return problems;
}

export async function runSmoke(baseUrl: string, options: { fetch?: SmokeFetch; expectEnv?: SmokeEnv } = {}): Promise<SmokeCheck[]> {
  const base = baseUrl.replace(/\/$/, '');
  const fetchFn: SmokeFetch = options.fetch ?? ((url, init) => fetch(url, init));
  const checks: SmokeCheck[] = [];
  const check = async (name: string, fn: () => Promise<string>) => {
    try {
      checks.push({ name, ok: true, detail: await fn() });
    } catch (err) {
      checks.push({ name, ok: false, detail: (err as Error).message });
    }
  };
  const get = async (path: string, accept: string) => {
    try {
      return await fetchFn(`${base}${path}`, { headers: { accept }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (err) {
      throw new Error((err as Error).name === 'TimeoutError' ? `${path}: keine Antwort innerhalb von ${REQUEST_TIMEOUT_MS / 1000} s` : `${path}: nicht erreichbar`);
    }
  };
  const expectStatus = (res: Response, path: string) => {
    if (res.status !== 200) throw new Error(`${path}: HTTP ${res.status}`);
  };

  let health: Response | undefined;
  await check('Health', async () => {
    health = await get('/api/v1/health', 'application/json');
    expectStatus(health, '/api/v1/health');
    const body = healthResponseSchema.parse(await health.clone().json());
    if (body.status !== 'ok' || body.db !== 'ok') throw new Error(`Status ${body.status}, Datenbank ${body.db}`);
    if (body.product !== productConfig.slug) throw new Error(`Produkt ${body.product} statt ${productConfig.slug}`);
    return `200, Datenbank ok, Version ${body.version}`;
  });
  await check('API-Header', async () => {
    if (!health) throw new Error('keine Health-Antwort');
    const missing = headerMismatches(health, apiSecurityHeaders);
    if (missing.length) throw new Error(`abweichend: ${missing.join(', ')}`);
    return `${Object.keys(apiSecurityHeaders).length} Sicherheits-Header wie erwartet`;
  });

  let html = '';
  let page: Response | undefined;
  await check('Startseite', async () => {
    page = await get('/', 'text/html');
    expectStatus(page, '/');
    html = await page.text();
    if (!(page.headers.get('content-type') ?? '').includes('text/html') || !html.includes('<div id="root">')) throw new Error('kein SPA-Dokument');
    return `200, ${html.length} Bytes HTML`;
  });
  await check('Startseite-Header', async () => {
    if (!page) throw new Error('keine Startseite');
    const missing = headerMismatches(page, spaSecurityHeaders);
    if (missing.length) throw new Error(`abweichend: ${missing.join(', ')}`);
    return `${Object.keys(spaSecurityHeaders).length} Sicherheits-Header wie erwartet (CSP mit default-src 'self')`;
  });
  await check('Asset', async () => {
    const path = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1];
    if (!path) throw new Error('kein Skript unter /assets/ in der Startseite');
    const res = await get(path, '*/*');
    expectStatus(res, path);
    await res.body?.cancel();
    const cache = res.headers.get('cache-control') ?? '';
    if (!cache.includes('immutable')) throw new Error(`${path}: Cache-Control „${cache}“`);
    return `${path}: 200, ${cache}`;
  });

  await check('Meta-Konfiguration', async () => {
    const res = await get('/api/v1/meta/config', 'application/json');
    expectStatus(res, '/api/v1/meta/config');
    const meta = metaConfigResponseSchema.parse(await res.json());
    if (options.expectEnv) {
      const problems = environmentProblems(meta, options.expectEnv);
      if (problems.length) throw new Error(`nicht ${options.expectEnv}: ${problems.join('; ')}`);
    }
    return `Umgebung ${meta.app_env}, Anbieter ${meta.providers_mode}, Zahlung ${meta.payment_mode}, Buchung ${meta.booking_enabled ? 'an' : 'aus'}, höchstens ${meta.limits.max_combinations} Kombinationen`;
  });
  await check('Autovervollständigung', async () => {
    const path = `/api/v1/geo/localities?q=${encodeURIComponent(SMOKE_LOCALITY)}`;
    const res = await get(path, 'application/json');
    expectStatus(res, path);
    const { items } = localitiesResponseSchema.parse(await res.json());
    const hit = items.find((i) => i.name === SMOKE_LOCALITY);
    if (!hit) throw new Error(`„${SMOKE_LOCALITY}“ nicht unter ${items.length} Treffern`);
    return `„${SMOKE_LOCALITY}“ gefunden (${hit.label}), ${items.length} Treffer`;
  });
  return checks;
}

export function formatSmoke(baseUrl: string, checks: SmokeCheck[], at: Date): string[] {
  const passed = checks.filter((c) => c.ok).length;
  return [
    `Smoke-Test gegen ${baseUrl} (${at.toISOString().slice(0, 16)}Z, nur lesend)`,
    ...checks.map((c) => `${c.ok ? '✓' : '✗'} ${c.name}: ${c.detail}`),
    `Ergebnis: ${passed}/${checks.length} Prüfungen bestanden`,
  ];
}
