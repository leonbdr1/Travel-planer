// POST /api/v1/searches and GET /api/v1/searches/{id} (architektur.md 6.4,
// 7.2): validation → ALTCHA → rate limits (fail-closed) → daily quota →
// search with all combinations → SearchWorkflow → 202 with a search token.
import { Hono, type Context } from 'hono';
import { productConfig } from '@reiseplaner/config';
import {
  createSearchRequestSchema,
  type CreateSearchResponse,
  type SearchCell,
  type SearchProgressResponse,
} from '@reiseplaner/contracts';
import {
  budgetReserve,
  countOffers,
  createSearch,
  getPlacesByIds,
  getSearch,
  progressCells,
  searchPlaces,
  setWorkflowInstance,
} from '@reiseplaner/db';
import { checkCombinations, constants, formatIsoDate, generateStayDates, splitOccupancy } from '@reiseplaner/domain';
import type { AppEnv } from '../app';
import { ConfigurationError, type RuntimeConfig } from '../env';
import { clientHash } from '../http/client';
import { ApiError } from '../http/errors';
import { rateLimit } from '../http/rate-limit';
import { parseJsonBody } from '../http/validate';
import { verifyAltcha } from '../services/altcha';
import { sha256Hex } from '../services/search-run';
import { constantTimeEqual } from '../services/tokens';
import { effectiveMaxCombinations } from '../services/maintenance';
import { getTravelTimes } from '../services/travel-times';

const HOUR_S = 3600;
const DAY_S = 86_400;

/** Search limits: higher only in local dev (Testbetrieb), as set in product.config.yaml. */
function searchLimits(config: RuntimeConfig): { searches_per_hour: number; searches_per_day: number } {
  return config.APP_ENV === 'dev' ? productConfig.limits.dev_rate_limits : productConfig.limits.rate_limits;
}

const DATE_MESSAGES: Record<string, string> = {
  invalid_date: 'Bitte gib gültige Daten ein.',
  invalid_nights: 'Die Anzahl der Nächte ist ungültig.',
  no_weekdays: 'Bitte wähle mindestens einen Anreisetag.',
  invalid_window: 'Die späteste Abreise muss nach der frühesten Anreise liegen.',
  window_in_past: 'Das Zeitfenster liegt in der Vergangenheit.',
  window_too_long: 'Das Zeitfenster ist zu lang.',
  window_too_short: 'Das Zeitfenster ist kürzer als der Aufenthalt.',
  no_dates: 'In diesem Zeitfenster gibt es keinen passenden Anreisetag.',
  too_many_dates: 'Zu viele Termine für eine Suche.',
};

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(constants.SEARCH_TOKEN_BYTES));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** Search token from `?token=` or `X-Search-Token`; unknown or wrong → 404 (no existence oracle). */
export async function authorizedSearch(c: Context<AppEnv>, id: string) {
  const token = c.req.query('token') ?? c.req.header('x-search-token') ?? '';
  const notFound = new ApiError(404, 'not_found', 'Diese Suche gibt es nicht oder der Link ist ungültig.');
  if (!/^[0-9a-f-]{36}$/.test(id) || token.length < 20) throw notFound;
  const search = await getSearch(c.get('deps').db(), id);
  if (!search || !constantTimeEqual(search.tokenHash, await sha256Hex(token))) throw notFound;
  return search;
}

export const searchRoutes = new Hono<AppEnv>()
  .post(
    '/',
    async (c, next) => {
      // Validation and ALTCHA come before the rate limits (architektur.md 6.4).
      const req = await parseJsonBody(c, createSearchRequestSchema);
      const secret = c.get('deps').env.ALTCHA_HMAC_KEY;
      if (!secret) throw new ConfigurationError(['ALTCHA_HMAC_KEY']);
      const check = await verifyAltcha(c.get('deps').db(), req.altcha, secret);
      if (!check.ok) {
        throw new ApiError(400, 'altcha_invalid', 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuche es erneut.', {
          reason: check.reason,
        });
      }
      c.set('searchRequest', req);
      await next();
    },
    rateLimit('searches-hour', (c) => searchLimits(c.get('deps').config).searches_per_hour, HOUR_S),
    rateLimit('searches-day', (c) => searchLimits(c.get('deps').config).searches_per_day, DAY_S),
    async (c) => {
      const deps = c.get('deps');
      const db = deps.db();
      const { altcha: _altcha, ...request } = c.get('searchRequest');
      const limits = productConfig.limits.search;

      const dates = generateStayDates(
        { window: request.window, nights: request.nights, nightsMax: request.nights_max ?? null, arrivalWeekdays: request.arrival_weekdays, today: formatIsoDate(Date.parse(deps.now().toISOString().slice(0, 10))) },
        { maxDates: limits.max_dates, maxNights: limits.max_nights, maxWindowDays: limits.max_window_days },
      );
      if (!dates.ok) {
        throw new ApiError(400, dates.error, DATE_MESSAGES[dates.error] ?? 'Ungültiges Zeitfenster.', dates.count === undefined ? {} : { count: dates.count });
      }
      const placeIds = [...new Set(request.place_ids)];
      if (placeIds.length > limits.max_places) {
        throw new ApiError(400, 'too_many_places', `Höchstens ${limits.max_places} Orte pro Suche.`);
      }
      // The look-to-book watch may lower the maximum for new searches.
      const maxCombinations = await effectiveMaxCombinations(db);
      const combos = checkCombinations(placeIds.length, dates.dates.length, maxCombinations);
      if (!combos.ok) {
        throw new ApiError(400, 'too_many_combinations', `Zu viele Kombinationen (${combos.count}); möglich sind höchstens ${maxCombinations}.`, {
          count: combos.count,
        });
      }
      const occ = request.occupancy;
      const rooms = splitOccupancy(occ.rooms, occ.adults, occ.children_ages);
      if (
        !rooms ||
        occ.rooms > limits.max_rooms ||
        rooms.some((r) => r.adults > limits.max_adults_per_room || r.childrenAges.length > limits.max_children_per_room)
      ) {
        throw new ApiError(400, 'invalid_occupancy', 'Diese Aufteilung auf Zimmer ist nicht möglich.');
      }
      const places = await getPlacesByIds(db, placeIds, { includeDrafts: deps.config.CATALOG_ALLOW_DRAFTS });
      if (places.length !== placeIds.length) throw new ApiError(400, 'unknown_place', 'Mindestens ein Ort ist unbekannt.');

      if (!(await budgetReserve(db, 'searches', 1, productConfig.limits.daily_quotas.searches))) {
        return c.json({ reason: 'quota' as const, cta: true, message: 'Heute sind keine weiteren Suchen möglich. Bitte versuche es morgen erneut.' }, 402);
      }

      const { times } = await getTravelTimes(
        {
          db,
          routing: deps.providers().routing,
          routingSource: deps.providers().sources.routing,
          now: deps.now(),
          orsDailyCap: productConfig.limits.daily_quotas.ors_calls,
        },
        request.origin,
        places,
      );
      const byId = new Map(places.map((p) => [p.id, p]));
      const token = randomToken();
      const created = await createSearch(db, {
        tokenHash: await sha256Hex(token),
        request,
        originLat: request.origin.lat,
        originLng: request.origin.lng,
        ipHash: await clientHash(c),
        places: placeIds.map((id) => ({
          placeId: id,
          driveMinutes: times.get(id) ? Math.round(times.get(id)?.durationMin ?? 0) : null,
          source: byId.get(id)?.kind === 'user' ? 'user' : 'suggested',
        })),
        dates: dates.dates,
      });
      const workflow = deps.env.SEARCH_WORKFLOW;
      if (!workflow) throw new ConfigurationError(['SEARCH_WORKFLOW']);
      const instance = await workflow.create({ id: created.id, params: { searchId: created.id } });
      await setWorkflowInstance(db, created.id, instance.id);
      const body: CreateSearchResponse = { search_id: created.id, token };
      return c.json(body, 202);
    },
  )
  .get('/:id', async (c) => {
    const search = await authorizedSearch(c, c.req.param('id'));
    const db = c.get('deps').db();
    const [places, cells, offers] = await Promise.all([searchPlaces(db, search.id), progressCells(db, search.id), countOffers(db, search.id)]);
    const dates = [...new Map(cells.map((x) => [`${x.checkin}|${x.checkout}`, { checkin: x.checkin, checkout: x.checkout }])).values()].sort((a, b) =>
      a.checkin.localeCompare(b.checkin) || a.checkout.localeCompare(b.checkout),
    );
    const body: SearchProgressResponse = {
      search: {
        id: search.id,
        status: search.status,
        combos_total: search.combosTotal,
        combos_done: search.combosDone,
        combos_failed: search.combosFailed,
        created_at: search.createdAt,
        started_at: search.startedAt,
        finished_at: search.finishedAt,
      },
      places: places.map((p) => ({ id: p.placeId, name: p.name, drive_minutes: p.driveMinutes, source: p.source })),
      dates,
      cells: cells.map(
        (x): SearchCell => ({
          place_id: x.placeId,
          checkin: x.checkin,
          checkout: x.checkout,
          state: x.status === 'pending' ? 'pending' : x.status === 'failed' ? 'failed' : x.offersCount > 0 ? 'offer' : 'no_offer',
          offers_count: x.offersCount,
          min_total_eur: x.minTotalCents === null ? null : x.minTotalCents / 100,
        }),
      ),
      offers_count: offers,
    };
    return c.json(body);
  });
