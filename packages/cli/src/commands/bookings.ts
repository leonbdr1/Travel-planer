// `npm run cli -- buchungen [--status <status>] [--limit 20]` and
// `npm run cli -- buchungen <BUCHUNGSNUMMER>`: support tool for the operator
// (B5). A guest writes "Buchung K7M2Q9XZ …" – this shows state, stay, price,
// the hotel's confirmation number, the last error and whether the e-mails
// went out. Read only; e-mail addresses are masked, tokens never printed.
import { bookingsByRefPrefix, getBookingByRef, listBookings, outboxForBooking, type Booking, type Queryable } from '@reiseplaner/db';
import { BOOKING_STATES, isBookingState, normalizeBookingRef } from '@reiseplaner/domain';
import { productConfig } from '@reiseplaner/config';
import { flag } from '../lib/args';
import { openCliDb } from '../lib/db';

const euro = (cents: number, currency: string) => (currency === 'EUR' ? `${(cents / 100).toFixed(2).replace('.', ',')} €` : `${(cents / 100).toFixed(2)} ${currency}`);
const day = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
const berlin = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: productConfig.markets.timezone });
const when = (iso: string | null) => (iso ? `${berlin.format(new Date(iso))} Uhr` : '–');

export function maskEmail(email: string | undefined | null): string {
  if (!email) return '(gelöscht)';
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

const STATUS_DE: Record<Booking['status'], string> = {
  draft: 'angelegt',
  prebooked: 'reserviert, Zahlung offen',
  booking: 'wird bestätigt',
  confirmed: 'bestätigt',
  failed: 'fehlgeschlagen',
  cancelled: 'storniert',
};

export async function bookingList(db: Queryable, options: { status?: Booking['status']; limit: number }): Promise<string[]> {
  const bookings = await listBookings(db, options);
  if (bookings.length === 0) return ['Keine Buchungen.'];
  return [
    '| Buchungsnummer | Status | Unterkunft | Aufenthalt | Betrag | angelegt | E-Mail |',
    '|---|---|---|---|---|---|---|',
    ...bookings.map(
      (b) =>
        `| ${b.bookingRef} | ${STATUS_DE[b.status]} | ${b.offer.hotelName}, ${b.offer.placeName} | ${day(b.checkin)}–${day(b.checkout)} | ${euro(b.totalCents, b.currency)} | ${when(b.createdAt)} | ${maskEmail(b.holder?.email)} |`,
    ),
  ];
}

export async function bookingDetail(db: Queryable, refInput: string): Promise<string[] | null> {
  const ref = normalizeBookingRef(refInput);
  const booking = ref ? await getBookingByRef(db, ref) : null;
  if (!booking) {
    // A typo in one character: offer the bookings that start the same way.
    const similar = await bookingsByRefPrefix(db, refInput.trim().toUpperCase().slice(0, 4), 5);
    return similar.length ? [`Keine Buchung ${refInput}. Ähnlich: ${similar.map((b) => b.bookingRef).join(', ')}`] : null;
  }
  const b = booking;
  const mails = await outboxForBooking(db, b.id);
  const guests = b.occupancy.reduce((s, o) => s + o.adults + o.childrenAges.length, 0);
  const cancel = b.cancellationPolicy ?? { refundable: b.offer.refundable, freeCancelUntil: b.offer.freeCancelUntil };
  return [
    `Buchung ${b.bookingRef} – ${STATUS_DE[b.status]}`,
    '',
    `Unterkunft:        ${b.offer.hotelName}, ${b.offer.placeName} (LiteAPI-Hotel ${b.hotelId})`,
    `Aufenthalt:        ${day(b.checkin)} – ${day(b.checkout)}, ${b.offer.nights} ${b.offer.nights === 1 ? 'Nacht' : 'Nächte'}, ${b.occupancy.length} Zimmer, ${guests} Gäste`,
    `Zimmer:            ${b.offer.roomName} (${b.offer.boardType})`,
    `Betrag:            ${euro(b.totalCents, b.currency)}${b.priceChanged ? ` (Preis geändert, bestätigt ${when(b.priceConfirmedAt)})` : ''}`,
    `Stornierung:       ${cancel.refundable ? `kostenlos bis ${when(cancel.freeCancelUntil)}` : 'nicht kostenlos'}`,
    `Gebucht von:       ${b.holder ? `${b.holder.firstName} ${b.holder.lastName}, ${maskEmail(b.holder.email)}` : '(Gastdaten gelöscht)'}`,
    `Bestätigung Hotel: ${b.hotelConfirmationCode ?? '–'}`,
    `LiteAPI-Buchung:   ${b.liteapiBookingId ?? '–'}`,
    `Angelegt:          ${when(b.createdAt)}`,
    `Bestätigt:         ${when(b.confirmedAt)}`,
    `Storniert:         ${when(b.cancelledAt)}${b.cancellationFeeCents !== null ? `, Gebühr ${euro(b.cancellationFeeCents, b.currency)}, Erstattung ${euro(b.refundCents ?? 0, b.currency)}` : ''}`,
    `Letzter Fehler:    ${b.lastError ?? '–'}`,
    '',
    'E-Mails:',
    ...(mails.length
      ? mails.map((m) => `  ${m.type}: ${m.status}, ${m.attempts} Versuch(e), angelegt ${when(m.createdAt)}${m.sentAt ? `, gesendet ${when(m.sentAt)}` : ''}${m.lastError ? `, Fehler: ${m.lastError}` : ''}`)
      : ['  keine']),
  ];
}

export async function bookingsCommand(args: string[], log: (line: string) => void): Promise<number> {
  const ref = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true);
  const status = flag(args, 'status');
  const limit = Number(flag(args, 'limit') ?? 20);
  if ((status && !isBookingState(status)) || !Number.isInteger(limit) || limit < 1 || limit > 500) {
    log(`usage: buchungen [--status ${BOOKING_STATES.join('|')}] [--limit 1..500] | buchungen <BUCHUNGSNUMMER>`);
    return 2;
  }
  const { db, via } = await openCliDb();
  try {
    log(`Datenbank: ${via}`);
    if (ref) {
      const lines = await bookingDetail(db, ref);
      if (!lines) {
        log(`Keine Buchung ${ref}.`);
        return 1;
      }
      for (const line of lines) log(line);
      return 0;
    }
    for (const line of await bookingList(db, { limit, ...(status && isBookingState(status) ? { status } : {}) })) log(line);
    return 0;
  } finally {
    await db.close();
  }
}
