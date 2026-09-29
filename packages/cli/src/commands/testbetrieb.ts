// `npm run cli -- testbetrieb einrichten [--from-env]` · `testbetrieb pruefen [--aufzeichnen]` · `testbetrieb aus`
//
// Local test operation with real data (HANDOFF drift 27): real hotels and
// prices (LiteAPI), real drive times (openrouteservice, optional) and the
// real AI review check (Anthropic, optional); e-mails stay simulated and
// booking is switched off. Keys are typed into the terminal (hidden) or taken
// from REISEPLANER_* environment variables and written to
// packages/worker/.dev.vars; no command prints a key.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { productConfig } from '@reiseplaner/config';
import { repoRoot } from '@reiseplaner/db/node';
import { blocksLanguage, constants, locationFacts, textBlocks, WALK_KINDS, type HotelDetails, type HotelSummary } from '@reiseplaner/domain';
import { createProviders, OVERPASS_PUBLIC_URL, ProviderError, type FetchLike } from '@reiseplaner/providers';
import { memorySkillHooks, runSkill } from '@reiseplaner/skills';
import { flag } from '../lib/args';
import { devVarsPath, updateDevVars } from '../lib/dev-vars';
import { cliEnv } from '../lib/env';

/** Variables the setup reads in --from-env mode (prefixed, so they never clash with other tools' keys). */
export const KEY_ENV = {
  liteapi: 'REISEPLANER_LITEAPI_API_KEY',
  ors: 'REISEPLANER_ORS_API_KEY',
  anthropic: 'REISEPLANER_ANTHROPIC_API_KEY',
  tripadvisor: 'REISEPLANER_TRIPADVISOR_API_KEY',
} as const;

export interface TestbetriebKeys {
  liteapi: string;
  ors?: string;
  anthropic?: string;
  tripadvisor?: string;
}

/** The .dev.vars block for the Testbetrieb (worker variables; see packages/worker/src/env.ts). */
export function testbetriebVars(keys: TestbetriebKeys): Record<string, string> {
  return {
    PROVIDERS_MODE: 'sandbox',
    MAIL_SOURCE: 'fake',
    BOOKING_ENABLED: 'false',
    CATALOG_ALLOW_DRAFTS: 'true',
    FAKE_LATENCY_MS: '0',
    FAKE_FAIL_EVERY: '0',
    LLM_ENABLED: keys.anthropic ? 'true' : 'false',
    LITEAPI_API_KEY: keys.liteapi,
    ...(keys.ors ? { ORS_API_KEY: keys.ors } : {}),
    ...(keys.anthropic ? { ANTHROPIC_API_KEY: keys.anthropic } : {}),
    ...(keys.tripadvisor ? { TRIPADVISOR_API_KEY: keys.tripadvisor } : {}),
  };
}

// Plain tokens (LiteAPI, Anthropic) and base64 ones ending in "=" (HeiGIT openrouteservice keys).
const KEY_PATTERN = /^[A-Za-z0-9_\-.+/=]{16,500}$/;

export function looksLikeKey(value: string): boolean {
  return KEY_PATTERN.test(value);
}

function cleanKey(value: string | undefined): string | undefined {
  const v = value?.trim().replace(/^["']|["']$/g, '');
  return v ? v : undefined;
}

/** Reads a line without echoing it (raw terminal); falls back to a plain line when stdin is no terminal. */
async function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  process.stdout.write(question);
  if (!stdin.isTTY) {
    return new Promise((done) => {
      let buffer = '';
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString();
        const nl = buffer.indexOf('\n');
        if (nl >= 0) {
          stdin.off('data', onData);
          stdin.pause();
          done(buffer.slice(0, nl).trim());
        }
      };
      stdin.on('data', onData);
      stdin.resume();
    });
  }
  return new Promise((done) => {
    let value = '';
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    const finish = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
      done(value.trim());
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return finish();
        if (ch === '\u0003') {
          stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
    stdin.resume();
  });
}

function keyKind(key: string): string {
  return key.startsWith('sand_') ? ' (Sandbox-Schlüssel)' : '';
}

async function setup(args: string[], log: (line: string) => void): Promise<number> {
  const fromEnv = args.includes('--from-env');
  let liteapi: string | undefined;
  let ors: string | undefined;
  let anthropic: string | undefined;
  let tripadvisor: string | undefined;
  if (fromEnv) {
    liteapi = cleanKey(process.env[KEY_ENV.liteapi]);
    ors = cleanKey(process.env[KEY_ENV.ors]);
    anthropic = cleanKey(process.env[KEY_ENV.anthropic]);
    tripadvisor = cleanKey(process.env[KEY_ENV.tripadvisor]);
  } else {
    log('Testbetrieb einrichten: Die Schlüssel werden nicht angezeigt, auch nicht beim Einfügen. Enter übernimmt.');
    liteapi = cleanKey(await askHidden('LiteAPI-Schlüssel (Pflicht): '));
    ors = cleanKey(await askHidden('openrouteservice-Schlüssel (optional, Enter = ohne, dann Luftlinie): '));
    anthropic = cleanKey(await askHidden('Anthropic-Schlüssel (optional, Enter = ohne, dann KI-Prüfung aus): '));
    tripadvisor = cleanKey(await askHidden('Tripadvisor-Schlüssel (optional, Enter = ohne, dann keine zweite Bewertungsquelle): '));
  }
  if (!liteapi) {
    log(fromEnv ? `Abbruch: ${KEY_ENV.liteapi} ist nicht gesetzt.` : 'Abbruch: Ohne LiteAPI-Schlüssel gibt es keine echten Unterkünfte.');
    return 1;
  }
  for (const [name, value] of Object.entries({ LiteAPI: liteapi, openrouteservice: ors, Anthropic: anthropic, Tripadvisor: tripadvisor })) {
    if (value && !looksLikeKey(value)) {
      log(`Abbruch: Der ${name}-Schlüssel sieht nicht wie ein API-Schlüssel aus (Leerzeichen oder Sonderzeichen?).`);
      return 1;
    }
  }
  const keys: TestbetriebKeys = { liteapi, ...(ors ? { ors } : {}), ...(anthropic ? { anthropic } : {}), ...(tripadvisor ? { tripadvisor } : {}) };
  updateDevVars(testbetriebVars(keys));
  log(`Gespeichert in ${relative(repoRoot, devVarsPath)} (Werte werden nicht angezeigt):`);
  log(`  Unterkünfte und Preise: echt über LiteAPI${keyKind(liteapi)}`);
  log(`  Fahrzeiten: ${ors ? 'echt über openrouteservice' : 'ohne Schlüssel als Luftlinie geschätzt'}`);
  log(`  KI-Prüfung der Rezensionen: ${anthropic ? `echt über Anthropic (Tagesdeckel ${productConfig.limits.llm_daily_budget_usd} $)` : 'aus'}`);
  log('  E-Mails: simuliert · Buchen: ausgeschaltet');
  log('Nächste Schritte: npm run cli -- testbetrieb pruefen, danach npm run dev (läuft npm run dev schon: neu starten).');
  return 0;
}

// ------------------------------------------------------------------ checks --

export interface TestbetriebCheck {
  name: string;
  status: 'ok' | 'fehler' | 'uebersprungen';
  detail: string;
}

export interface CheckOptions {
  env: Record<string, string | undefined>;
  now: Date;
  fetch?: FetchLike;
  /** Directory for raw LiteAPI and openrouteservice responses (contract check). */
  recordDir?: string;
}

/** Füssen: many hotels of every kind, reachable from the default origin. */
const CHECK_PLACE = { name: 'Füssen', lat: 47.5703, lng: 10.7003 };
const CHECK_ORIGIN = { name: 'Stuttgart', lat: 48.7823, lng: 9.177 };
const CHECK_WISH = 'ruhig, mit Sauna und Blick auf den See';
const CHECK_AI_CAP_USD = 0.05;

function errorText(err: unknown): string {
  if (err instanceof ProviderError) return `${err.kind}${err.status ? ` (HTTP ${err.status})` : ''}: ${err.message}`.slice(0, 500);
  return `${(err as Error).name}: ${(err as Error).message}`.slice(0, 500);
}

/** First Friday at least three weeks ahead: realistic availability for a weekend. */
export function checkDates(now: Date): { checkin: string; checkout: string } {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 21));
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  const checkin = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 2);
  return { checkin, checkout: d.toISOString().slice(0, 10) };
}

/**
 * What the evaluation needs per house: the rates answer carries only part of
 * it (real LiteAPI: rating, no review count, no coordinates); step
 * `hotel-content` takes the rest from the details, so those must have it.
 */
export function hotelDataCheck(rateHotels: readonly HotelSummary[], details: HotelDetails): [string, TestbetriebCheck['status'], string] {
  const n = rateHotels.length;
  const share = (pick: (h: HotelSummary) => unknown) => `${rateHotels.filter((h) => pick(h) !== null && pick(h) !== undefined).length}/${n}`;
  const rates = `Tarifantwort: Note ${share((h) => h.rating)}, Anzahl Bewertungen ${share((h) => h.reviewCount)}, Koordinaten ${share((h) => h.lat)}, Sterne ${share((h) => h.stars)}`;
  const d = details;
  const detail =
    `Details: Note ${d.rating ?? '–'}, ${d.reviewCount ?? '–'} Bewertungen, Sterne ${d.stars ?? '–'}, ` +
    `Koordinaten ${d.lat !== null && d.lng !== null ? 'ja' : 'nein'}, ${d.facilityIds.length} Ausstattungs-IDs`;
  const ok = d.reviewCount !== null && d.lat !== null && d.lng !== null;
  return ['LiteAPI Hoteldaten', ok ? 'ok' : 'fehler', `${rates}; ${detail}${ok ? '' : ' (ohne Anzahl oder Koordinaten bleiben Häuser unbewertet)'}`];
}

/**
 * Whether the details came in the site's language (`language` on /data/hotel,
 * HANDOFF drift 38): description and important information together.
 */
export function detailsLanguageCheck(details: HotelDetails, language: string): [string, TestbetriebCheck['status'], string] {
  const found = blocksLanguage([...textBlocks(details.description), ...textBlocks(details.importantInformation)]);
  const name = `LiteAPI Texte (language=${language})`;
  if (found === language) return [name, 'ok', 'Beschreibung und Hinweise kommen auf Deutsch'];
  if (found === null) return [name, 'ok', 'Sprache der Texte nicht erkennbar (zu kurz oder gemischt)'];
  return [name, 'fehler', `Texte kommen auf ${found === 'en' ? 'Englisch' : found}: die Sprachwahl wirkt nicht, die Detailseite kennzeichnet sie als englisch`];
}

export async function runTestbetriebChecks(options: CheckOptions): Promise<TestbetriebCheck[]> {
  const env = options.env;
  const baseFetch: FetchLike = options.fetch ?? ((input, init) => fetch(input, init));
  let recorded = 0;
  const recordingFetch: FetchLike = async (input, init) => {
    const res = await baseFetch(input, init);
    if (options.recordDir && !input.includes('anthropic.com')) {
      recorded += 1;
      const url = new URL(input);
      const name = `${String(recorded).padStart(2, '0')}-${url.hostname.split('.')[0]}${url.pathname.replace(/[^a-z0-9]+/gi, '-')}.json`;
      writeFileSync(join(options.recordDir, name.replace(/-+\.json$/, '.json')), await res.clone().text());
    }
    return res;
  };
  const providers = createProviders(
    {
      mode: 'sandbox',
      sources: { mail: 'fake' },
      liteapi: {
        apiKey: env.LITEAPI_API_KEY,
        baseUrl: env.LITEAPI_BASE_URL ?? 'https://api.liteapi.travel/v3.0',
        bookBaseUrl: env.LITEAPI_BOOK_BASE_URL ?? 'https://book.liteapi.travel/v3.0',
      },
      ors: { apiKey: env.ORS_API_KEY, baseUrl: env.ORS_BASE_URL ?? 'https://api.heigit.org/openrouteservice' },
      overpass: { baseUrl: env.OVERPASS_BASE_URL ?? OVERPASS_PUBLIC_URL },
      resend: {},
      anthropic: { apiKey: env.ANTHROPIC_API_KEY },
    },
    { fetch: recordingFetch },
  );
  const checks: TestbetriebCheck[] = [];
  const add = (name: string, status: TestbetriebCheck['status'], detail: string) => checks.push({ name, status, detail });

  // LiteAPI: rates around a real place, then details, reviews and facilities of one hotel.
  let hotelId: string | undefined;
  let rateHotels: HotelSummary[] = [];
  if (!env.LITEAPI_API_KEY) {
    add('LiteAPI Tarife', 'fehler', 'kein Schlüssel: zuerst npm run cli -- testbetrieb einrichten');
  } else {
    const { checkin, checkout } = checkDates(options.now);
    try {
      const started = Date.now();
      const result = await providers.liteapi.searchRates({
        lat: CHECK_PLACE.lat,
        lng: CHECK_PLACE.lng,
        radiusKm: constants.DEFAULT_SEARCH_RADIUS_KM,
        checkin,
        checkout,
        occupancies: [{ adults: 2, childrenAges: [] }],
        currency: productConfig.markets.currency,
        guestNationality: productConfig.markets.guest_nationality,
        timeoutS: constants.LITEAPI_RATES_TIMEOUT_S,
        limit: constants.LITEAPI_RATES_LIMIT,
      });
      const cheapest = result.rates
        .flatMap((r) => r.options.map((o) => ({ hotelId: r.hotelId, o })))
        .sort((a, b) => a.o.totalCents - b.o.totalCents)[0];
      rateHotels = result.hotels;
      const info = result.hotels.find((h) => h.id === cheapest?.hotelId);
      hotelId = cheapest?.hotelId ?? result.hotels[0]?.id;
      add(
        'LiteAPI Tarife',
        result.rates.length > 0 ? 'ok' : 'fehler',
        result.rates.length > 0
          ? `${CHECK_PLACE.name}, ${checkin} bis ${checkout}: ${result.rates.length} Unterkünfte mit Angeboten in ${Date.now() - started} ms; ` +
              `günstigstes: ${info?.name ?? cheapest?.hotelId} für ${((cheapest?.o.totalCents ?? 0) / 100).toFixed(2)} ${cheapest?.o.currency ?? ''}`
          : `${CHECK_PLACE.name}, ${checkin} bis ${checkout}: Antwort ohne Angebote (${result.hotels.length} Unterkünfte in der Antwort)`,
      );
    } catch (err) {
      add('LiteAPI Tarife', 'fehler', errorText(err));
    }
    if (hotelId) {
      const id = hotelId;
      try {
        const h = await providers.liteapi.getHotel(id, { language: productConfig.markets.language });
        add('LiteAPI Hoteldetails', 'ok', `${h.name}: ${h.photos.length} Fotos, Beschreibung ${h.description ? 'vorhanden' : 'fehlt'}, ${h.facilities.length} Ausstattungsmerkmale`);
        add(...hotelDataCheck(rateHotels, h));
        add(...detailsLanguageCheck(h, productConfig.markets.language));
      } catch (err) {
        add('LiteAPI Hoteldetails', 'fehler', errorText(err));
      }
      try {
        const r = await providers.liteapi.getReviews(id, { limit: 20, withSentiment: false });
        const languages = [...new Set(r.reviews.map((x) => x.language).filter(Boolean))].join(', ');
        add('LiteAPI Rezensionen', 'ok', `${r.reviews.length} Rezensionen geladen${languages ? ` (Sprachen: ${languages})` : ''}`);
      } catch (err) {
        add('LiteAPI Rezensionen', 'fehler', errorText(err));
      }
    } else {
      add('LiteAPI Hoteldetails', 'uebersprungen', 'keine Unterkunft aus der Tarifsuche');
      add('LiteAPI Rezensionen', 'uebersprungen', 'keine Unterkunft aus der Tarifsuche');
    }
    try {
      const f = await providers.liteapi.getFacilities();
      add('LiteAPI Ausstattungsliste', 'ok', `${f.length} Merkmale`);
    } catch (err) {
      add('LiteAPI Ausstattungsliste', 'fehler', errorText(err));
    }
  }

  // openrouteservice: one matrix call.
  if (!env.ORS_API_KEY) {
    add('Fahrzeiten', 'uebersprungen', 'kein Schlüssel: Fahrzeiten werden als Luftlinie geschätzt und so gekennzeichnet');
  } else {
    try {
      const [t] = await providers.routing.matrix(CHECK_ORIGIN, [CHECK_PLACE]);
      add('Fahrzeiten', t ? 'ok' : 'fehler', t ? `${CHECK_ORIGIN.name} → ${CHECK_PLACE.name}: ${t.durationMin} min, ${t.distanceKm} km` : 'keine Route gefunden');
    } catch (err) {
      add('Fahrzeiten', 'fehler', errorText(err));
    }
  }

  // OpenStreetMap (Overpass): points around the centre of the check place, no key.
  try {
    const pois = await providers.poi.around([CHECK_PLACE], constants.LOCATION_SEARCH_RADIUS_M, constants.LOCATION_GASTRO_RADIUS_M);
    const facts = locationFacts(CHECK_PLACE, pois);
    const walk = WALK_KINDS.filter((k) => facts.walk[k] !== null).map((k) => `${k} ${facts.walk[k]} min`);
    add('Lage (OpenStreetMap)', pois.length > 0 ? 'ok' : 'fehler', `${CHECK_PLACE.name}: ${pois.length} Punkte, ${walk.join(', ') || 'nichts in Gehweite'}, ${facts.gastro} Restaurants nah`);
  } catch (err) {
    add('Lage (OpenStreetMap)', 'fehler', errorText(err));
  }

  // Anthropic: one real skill run through the runner (model, forced tool call, output check).
  if (!env.ANTHROPIC_API_KEY) {
    add('KI', 'uebersprungen', 'kein Schlüssel: Rezensionscheck und Wunschübersetzung sind aus');
  } else {
    const hooks = memorySkillHooks(CHECK_AI_CAP_USD);
    const result = await runSkill<{ chips: string[]; themes: string[] }>(
      { llm: providers.llm, llmEnabled: true, prices: productConfig.ai, budget: hooks.budget, telemetry: hooks.telemetry },
      'reiseplaner.wish-parse',
      { text: CHECK_WISH },
      { correlationId: 'testbetrieb-check' },
    );
    add(
      'KI',
      result.ok ? 'ok' : 'fehler',
      result.ok
        ? `„${CHECK_WISH}“ → ${[...result.output.chips, ...result.output.themes].join(', ') || 'keine Zuordnung'} (${result.model}, ${result.costUsd.toFixed(4)} $)`
        : `${result.outcome}: ${result.reason}`.slice(0, 500),
    );
  }
  return checks;
}

async function check(args: string[], log: (line: string) => void): Promise<number> {
  const env = cliEnv();
  const record = args.includes('--aufzeichnen');
  const recordDir = record
    ? resolve(repoRoot, flag(args, 'aufzeichnen') ?? `.data/testbetrieb-aufnahmen/${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`)
    : undefined;
  if (recordDir) mkdirSync(recordDir, { recursive: true });
  log('Testbetrieb prüfen: je ein echter Aufruf pro Anbieter (Schlüssel aus packages/worker/.dev.vars, werden nicht angezeigt) …');
  const checks = await runTestbetriebChecks({ env, now: new Date(), ...(recordDir ? { recordDir } : {}) });
  for (const c of checks) log(`${c.status === 'ok' ? '✓' : c.status === 'fehler' ? '✗' : '–'} ${c.name}: ${c.detail}`);
  if (recordDir) log(`Rohantworten gespeichert in ${relative(repoRoot, recordDir)}`);
  const failed = checks.filter((c) => c.status === 'fehler');
  log(
    failed.length
      ? `${failed.length} Prüfung(en) fehlgeschlagen. Die Ausgabe enthält keine Schlüssel und kann so weitergegeben werden.`
      : 'Alles bereit: npm run dev starten und http://localhost:5173 öffnen.',
  );
  return failed.length ? 1 : 0;
}

export async function testbetriebCommand(args: string[], log: (line: string) => void): Promise<number> {
  switch (args[0]) {
    case 'einrichten':
      return setup(args, log);
    case 'pruefen':
      return check(args, log);
    case 'aus':
      updateDevVars(null);
      log('Testbetrieb aus: Alle Anbieter sind wieder simuliert (npm run dev neu starten). Die Schlüssel sind aus packages/worker/.dev.vars entfernt.');
      return 0;
    default:
      log('usage: testbetrieb einrichten [--from-env] | pruefen [--aufzeichnen [<ordner>]] | aus');
      return 2;
  }
}
