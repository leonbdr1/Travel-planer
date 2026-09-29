// Smoke test (S10.1) against a scripted deployment: all checks pass for a
// correct one; outage, missing headers, wrong environment and network
// errors fail exactly the affected checks.
import { describe, expect, it } from 'vitest';
import { productConfig } from '@reiseplaner/config';
import { apiSecurityHeaders, spaSecurityHeaders } from '@reiseplaner/worker/security-headers';
import { runSmoke, type SmokeFetch } from '../src/commands/smoke';

const BASE = 'https://staging.example';
const meta = {
  app_env: 'staging',
  providers_mode: 'sandbox',
  llm_enabled: true,
  payment_mode: 'sandbox',
  booking_enabled: true,
  provider_sources: { liteapi: 'real', routing: 'real', llm: 'real', mail: 'real', poi: 'real' },
  end_user_view: false,
  dev_settings: false,
  catalog_drafts: false,
  chips: [],
  themes: [],
  limits: { max_places: 10, max_dates: 12, max_combinations: 120, max_nights: 14, max_rooms: 4, max_adults_per_room: 4, max_children_per_room: 3, max_window_days: 92, wish_text_max_chars: 500 },
  ai_labels: {},
  attribution: [],
};
const stuttgart = { geonameid: 2825297, name: 'Stuttgart', label: 'Stuttgart, Baden-Württemberg, DE', admin_name: 'Baden-Württemberg', country_code: 'DE', lat: 48.78, lng: 9.18, population: 630305 };

function deployment(overrides: { health?: number; spaHeaders?: Record<string, string>; meta?: Partial<typeof meta>; down?: string } = {}): SmokeFetch {
  return async (url) => {
    const path = url.slice(BASE.length);
    if (overrides.down && path.startsWith(overrides.down)) throw new TypeError('fetch failed');
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...apiSecurityHeaders } });
    if (path === '/api/v1/health') {
      const ok = (overrides.health ?? 200) === 200;
      return json({ status: ok ? 'ok' : 'degraded', db: ok ? 'ok' : 'down', version: 'abc1234', product: productConfig.slug }, overrides.health ?? 200);
    }
    if (path === '/') {
      return new Response('<!doctype html><html><head><script type="module" crossorigin src="/assets/index-X1.js"></script></head><body><div id="root"></div></body></html>', {
        headers: { 'content-type': 'text/html; charset=utf-8', ...(overrides.spaHeaders ?? spaSecurityHeaders) },
      });
    }
    if (path === '/assets/index-X1.js') return new Response('export {};', { headers: { 'content-type': 'text/javascript', 'cache-control': 'public, max-age=31536000, immutable' } });
    if (path === '/api/v1/meta/config') return json({ ...meta, ...overrides.meta });
    if (path.startsWith('/api/v1/geo/localities?q=Stuttgart')) return json({ items: [stuttgart] });
    return json({ error: { code: 'not_found' } }, 404);
  };
}

const failed = (checks: Array<{ name: string; ok: boolean }>) => checks.filter((c) => !c.ok).map((c) => c.name);

describe('runSmoke', () => {
  it('passes all seven checks against a correct staging deployment', async () => {
    const checks = await runSmoke(`${BASE}/`, { fetch: deployment(), expectEnv: 'staging' });
    expect(checks.map((c) => c.name)).toEqual(['Health', 'API-Header', 'Startseite', 'Startseite-Header', 'Asset', 'Meta-Konfiguration', 'Autovervollständigung']);
    expect(failed(checks)).toEqual([]);
  });

  it('fails health when the database is down', async () => {
    const checks = await runSmoke(BASE, { fetch: deployment({ health: 503 }) });
    expect(failed(checks)).toEqual(['Health']);
    expect(checks[0]?.detail).toBe('/api/v1/health: HTTP 503');
  });

  it('names a missing security header of the start page', async () => {
    const { 'Content-Security-Policy': _csp, ...withoutCsp } = spaSecurityHeaders;
    const checks = await runSmoke(BASE, { fetch: deployment({ spaHeaders: withoutCsp }) });
    expect(failed(checks)).toEqual(['Startseite-Header']);
    expect(checks.find((c) => c.name === 'Startseite-Header')?.detail).toBe('abweichend: Content-Security-Policy');
  });

  it('rejects a production deployment still running simulated providers', async () => {
    const checks = await runSmoke(BASE, {
      fetch: deployment({ meta: { app_env: 'production', providers_mode: 'fake', payment_mode: 'sandbox', provider_sources: { liteapi: 'fake', routing: 'fake', llm: 'fake', mail: 'fake', poi: 'fake' } } }),
      expectEnv: 'production',
    });
    expect(failed(checks)).toEqual(['Meta-Konfiguration']);
    expect(checks.find((c) => c.name === 'Meta-Konfiguration')?.detail).toBe(
      'nicht production: providers_mode fake statt live; payment_mode sandbox statt live; simuliert: liteapi, routing, llm, mail, poi',
    );
  });

  it('reports an unreachable endpoint as a failed check', async () => {
    const checks = await runSmoke(BASE, { fetch: deployment({ down: '/api/v1/geo' }) });
    expect(failed(checks)).toEqual(['Autovervollständigung']);
    expect(checks.at(-1)?.detail).toContain('nicht erreichbar');
  });
});
