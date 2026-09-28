// S9.3 demo against the local stack in preview mode: production build of the
// SPA served like Workers Static Assets (including `_headers`), Worker in
// workerd. Shows the security headers of the start page and of an API
// response, then runs a booking (create → complete → view → access link →
// cancel) the way the SPA does (tokens in headers), triggers the three cron
// jobs (outbox, cache cleanup, daily) and scans the Worker log and the
// responses for the guest's e-mail address, phone number and tokens.
import { spawnSync } from 'node:child_process';
import { bookingCompleteResponseSchema, bookingCreateResponseSchema, bookingViewSchema, searchResultsResponseSchema } from '@reiseplaner/contracts';
import { repoRoot } from '@reiseplaner/db/node';
import { constants } from '@reiseplaner/domain';
import { CRON_SCHEDULES } from '@reiseplaner/worker/cron';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { catalogPlaceIds, demoSearchRequest } from '../lib/search-request';
import { startDemoStack, type DemoStack } from '../lib/stack';
import { seedDevData } from '../seed';

const SHOWN_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'x-frame-options',
  'cross-origin-opener-policy',
  'cache-control',
];
const EMAIL = 'erika.mustermann@example.org';
const PHONE = '+49 170 5550123';

async function call(stack: DemoStack, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${stack.baseUrl}/api/v1${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  return { status: res.status, text, body: (text ? JSON.parse(text) : null) as unknown };
}

function headerList(out: DemoOutput, title: string, res: Response) {
  out.log(`${title} → ${res.status}`);
  for (const name of SHOWN_HEADERS) out.log(`  ${name}: ${res.headers.get(name) ?? '—'}`);
}

export async function run(out: DemoOutput): Promise<number> {
  out.log('building the production bundle (npm run build) …');
  const build = spawnSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'ignore' });
  if (build.status !== 0) throw new Error('npm run build failed');
  out.log('starting local stack in preview mode …');
  const stack = await startDemoStack({ preview: true, onReady: (db) => seedDevData(db, () => undefined) });
  try {
    headerList(out, 'GET / (Startseite, statische Assets mit _headers)', await fetch(`${stack.baseUrl}/`));
    headerList(out, 'GET /api/v1/meta/config (API, Worker-Middleware)', await fetch(`${stack.baseUrl}/api/v1/meta/config`));

    const places = await catalogPlaceIds(stack.db.db, ['Füssen']);
    const created = (await call(stack, 'POST', '/searches', demoSearchRequest(places, { start: '2026-10-01', end: '2026-10-12' }, await altchaPayload(stack.baseUrl)))).body as {
      search_id: string;
      token: string;
    };
    const searchAuth = { 'x-search-token': created.token };
    const started = Date.now();
    while (Date.now() - started < constants.SEARCH_JOB_TIMEOUT_S * 1000) {
      const s = (await call(stack, 'GET', `/searches/${created.search_id}`, undefined, searchAuth)).body as { search: { status: string } };
      if (['done', 'partial', 'failed'].includes(s.search.status)) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    const results = searchResultsResponseSchema.parse((await call(stack, 'GET', `/searches/${created.search_id}/results?refundable=true`, undefined, searchAuth)).body);
    const item = results.items[0];
    if (!item) throw new Error('no result');

    const create = await call(stack, 'POST', '/bookings', {
      search_id: created.search_id,
      search_token: created.token,
      offer_id: item.best_offer.id,
      holder: { first_name: 'Erika', last_name: 'Mustermann', email: EMAIL, phone: PHONE },
      guests: [{ room: 1, first_name: 'Erika', last_name: 'Mustermann' }],
      accepted_terms: true,
      acknowledged_no_withdrawal: true,
    });
    const booking = bookingCreateResponseSchema.parse(create.body);
    const session = { 'x-booking-token': booking.session_token };
    if (booking.price_changed) await call(stack, 'POST', `/bookings/${booking.booking_ref}/confirm-price`, {}, session);
    const complete = await call(stack, 'POST', `/bookings/${booking.booking_ref}/complete`, {}, session);
    const done = bookingCompleteResponseSchema.parse(complete.body);
    const access = { 'x-booking-token': done.access_token ?? '' };
    const view = await call(stack, 'GET', `/bookings/${booking.booking_ref}`, undefined, access);
    const shown = bookingViewSchema.parse(view.body);
    const link = await call(stack, 'POST', '/bookings/access-link', { booking_ref: booking.booking_ref, email: EMAIL, altcha: await altchaPayload(stack.baseUrl) });
    const unknown = await call(stack, 'POST', '/bookings/access-link', { booking_ref: 'ZZZZZZZZ', email: EMAIL, altcha: await altchaPayload(stack.baseUrl) });
    const cancel = await call(stack, 'POST', `/bookings/${booking.booking_ref}/cancel`, { dry_run: false }, access);
    out.log(
      `Buchung ${booking.booking_ref}: create ${create.status}, complete ${complete.status} (${done.booking.status}), Ansicht ${view.status} mit ${shown.holder?.email_masked}, ` +
        `Zugangslink ${link.status}, unbekannte Nummer ${unknown.status}, Storno ${cancel.status}`,
    );

    // Cron jobs process the guest's data (outbox, retention, review invites) and log summaries.
    for (const cron of CRON_SCHEDULES) {
      const res = await fetch(`${stack.baseUrl}/cdn-cgi/handler/scheduled?cron=${encodeURIComponent(cron)}`);
      out.log(`Cron ${cron} → ${res.status}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
    const log = stack.log();
    const secrets: Array<[string, string]> = [
      ['E-Mail-Adresse', EMAIL],
      ['Telefonnummer', PHONE.replace(/\D/g, '').slice(-7)],
      ['Such-Token', created.token],
      ['Sitzungstoken', booking.session_token],
      ['Zugangstoken', done.access_token ?? '(fehlt)'],
    ];
    const workerLines = log.split('\n').filter((l) => l.trim().startsWith('{"level"'));
    out.log(`Worker-Log: ${log.split('\n').length} Zeilen, davon ${workerLines.length} strukturierte Worker-Logs; Stichprobe:`);
    for (const line of workerLines.slice(-6)) out.log(`  ${line.trim().slice(0, 200)}`);
    let leaks = 0;
    for (const [label, value] of secrets) {
      const inLog = log.split(value).length - 1;
      const inResponses = [view.text, link.text, unknown.text, cancel.text].filter((t) => t.includes(value)).length;
      leaks += inLog + inResponses;
      out.log(`  ${label}: ${inLog}× im Log, ${inResponses}× in Antworten (Ansicht, Zugangslink, Storno)`);
    }
    const ok =
      leaks === 0 &&
      done.booking.status === 'confirmed' &&
      shown.holder?.email_masked === 'e***@example.org' &&
      link.status === 202 &&
      unknown.status === 202 &&
      cancel.status === 200;
    out.log(ok ? '→ Header gesetzt; keine Klartext-E-Mail, keine Telefonnummer und kein Token in Log und Antworten' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
