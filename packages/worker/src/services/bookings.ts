// Booking flow (architektur.md 3.4, 6.11, 7.2, 10): create with prebook,
// confirm a changed price, complete after payment (idempotent, row lock),
// view and cancel with the access token, access link by e-mail.
// LiteAPI ids are only read on the server; tokens are never logged.
import type { BookingCompleteResponse, BookingCreateRequest, BookingCreateResponse, BookingView, CancelResponse } from '@reiseplaner/contracts';
import { searchRequestSchema } from '@reiseplaner/contracts';
import {
  applyBookingEvent,
  budgetReserve,
  budgetSettle,
  confirmBookingPrice,
  createBookingDraft,
  getBookableOffer,
  getBookingById,
  getBookingByRef,
  getSearch,
  refreshOfferQuote,
  type BookableOffer,
  type Booking,
  type Db,
} from '@reiseplaner/db';
import {
  BOARD_LABELS,
  BOOKING_TEXTS,
  bookingRefFromBytes,
  cancellationPreview,
  constants,
  decideComplete,
  findEquivalentOption,
  normalizeBookingRef,
  splitOccupancy,
  toOffer,
  type Occupancy,
} from '@reiseplaner/domain';
import { ProviderError, type LiteApiPort, type MailPort, type PrebookResult } from '@reiseplaner/providers';
import { ApiError } from '../http/errors';
import { sendViaOutbox } from '../mail/outbox';
import { sha256Hex } from './search-run';
import { constantTimeEqual, emailHash, signToken, verifyToken } from './tokens';

export interface BookingDeps {
  db: Db;
  liteapi: LiteApiPort;
  mail: MailPort;
  now: () => Date;
  signingKey: string;
  /** Public origin for links in e-mails and the payment return URL. */
  origin: string;
  paymentMode: 'sandbox' | 'live';
  /** Fake mode: the SPA simulates the payment SDK. */
  simulatedPayment: boolean;
  bookingEnabled: boolean;
  randomBytes: (n: number) => Uint8Array;
  /** For re-quoting a stale offer right before the prebook (same values as the search). */
  currency: string;
  guestNationality: string;
  liteapiDailyCap: number;
}

const eur = (cents: number) => cents / 100;

function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

export function bookingView(b: Booking, now: Date): BookingView {
  return {
    booking_ref: b.bookingRef,
    status: b.status,
    hotel: { id: b.hotelId, name: b.offer.hotelName, place_name: b.offer.placeName },
    checkin: b.checkin,
    checkout: b.checkout,
    nights: b.offer.nights,
    room_name: b.offer.roomName,
    board_type: b.offer.boardType,
    rooms: b.occupancy.length,
    guests: b.occupancy.reduce((s, o) => s + o.adults + o.childrenAges.length, 0),
    total_eur: eur(b.totalCents),
    currency: b.currency,
    pay_at_property_eur: eur(b.offer.payAtPropertyCents),
    pay_at_property_known: b.offer.payAtPropertyKnown,
    cancellation: { refundable: b.cancellationPolicy?.refundable ?? b.offer.refundable, free_cancel_until: b.cancellationPolicy?.freeCancelUntil ?? b.offer.freeCancelUntil },
    hotel_confirmation_code: b.hotelConfirmationCode,
    holder: b.holder ? { first_name: b.holder.firstName, last_name: b.holder.lastName, email_masked: maskEmail(b.holder.email) } : null,
    confirmed_at: b.confirmedAt,
    cancelled_at: b.cancelledAt,
    cancellation_fee_eur: b.cancellationFeeCents === null ? null : eur(b.cancellationFeeCents),
    refund_eur: b.refundCents === null ? null : eur(b.refundCents),
    can_cancel: b.status === 'confirmed' && b.checkin > now.toISOString().slice(0, 10),
  };
}

function refGenerator(deps: BookingDeps): () => string {
  return () => bookingRefFromBytes(deps.randomBytes(5));
}

/** Holder of a valid token for this booking (403 otherwise, without telling whether the reference exists). */
async function authorize(deps: BookingDeps, ref: string, token: string, purpose: 'session' | 'access'): Promise<Booking> {
  const denied = new ApiError(403, 'forbidden', BOOKING_TEXTS.tokenInvalid);
  const check = await verifyToken(deps.signingKey, token, purpose, deps.now());
  if (!check.ok) throw denied;
  const booking = await getBookingById(deps.db, check.bookingId);
  if (!booking || booking.bookingRef !== normalizeBookingRef(ref)) throw denied;
  if (purpose === 'access' && (!booking.holder || check.emailHash !== (await emailHash(booking.holder.email)))) throw denied;
  return booking;
}

async function accessToken(deps: BookingDeps, b: Booking): Promise<string | null> {
  if (!b.holder) return null;
  return signToken(deps.signingKey, {
    bookingId: b.id,
    purpose: 'access',
    expiresAt: new Date(deps.now().getTime() + constants.BOOKING_ACCESS_TOKEN_TTL_S * 1000),
    emailHash: await emailHash(b.holder.email),
  });
}

const logWarn = (msg: string, fields: Record<string, string | number | undefined> = {}) => console.error(JSON.stringify({ level: 'warn', msg, ...fields }));

function providerFields(err: unknown) {
  return err instanceof ProviderError ? { kind: err.kind, status: err.status } : { kind: 'error' };
}

type PayablePrebook = PrebookResult & { transactionId: string; secretKey: string };

/** Prebook and make sure the guest can go on to pay: the payment SDK needs a transaction id and a secret key. */
async function prebookOnce(deps: BookingDeps, liteapiOfferId: string): Promise<PayablePrebook> {
  const prebook = await deps.liteapi.prebook(liteapiOfferId);
  if (!prebook.transactionId || !prebook.secretKey) {
    logWarn('prebook without payment sdk data');
    throw new ApiError(503, 'payment_unavailable', BOOKING_TEXTS.paymentUnavailable);
  }
  return { ...prebook, transactionId: prebook.transactionId, secretKey: prebook.secretKey };
}

/**
 * A fresh quote of the tariff the guest chose (same room, board and
 * cancellation kind) for this hotel and stay; the stored offer takes over its
 * rate id and price. A tariff that is gone at the supplier is "not available".
 */
async function requote(deps: BookingDeps, offer: BookableOffer, occupancy: readonly Occupancy[]): Promise<string> {
  if (!(await budgetReserve(deps.db, 'liteapi_calls', 1, deps.liteapiDailyCap))) {
    logWarn('requote skipped: liteapi budget used up');
    throw new ApiError(503, 'provider_unavailable', BOOKING_TEXTS.providerUnavailable);
  }
  let options;
  try {
    const rates = await deps.liteapi.searchHotelRates({
      hotelId: offer.hotelId,
      checkin: offer.checkin,
      checkout: offer.checkout,
      occupancies: [...occupancy],
      currency: deps.currency,
      guestNationality: deps.guestNationality,
      timeoutS: constants.LITEAPI_RATES_TIMEOUT_S,
    });
    options = rates.rates.find((r) => r.hotelId === offer.hotelId)?.options ?? [];
  } catch (err) {
    logWarn('requote failed', providerFields(err));
    throw new ApiError(503, 'provider_unavailable', BOOKING_TEXTS.providerUnavailable);
  } finally {
    await budgetSettle(deps.db, 'liteapi_calls', 1, 1).catch(() => undefined);
  }
  const fresh = findEquivalentOption(options, offer);
  if (!fresh) {
    logWarn('requote: tariff gone');
    throw new ApiError(409, 'offer_unavailable', BOOKING_TEXTS.offerUnavailable);
  }
  await refreshOfferQuote(deps.db, offer.id, toOffer(offer.hotelId, offer.kind, fresh, offer.nights));
  return fresh.offerId;
}

/**
 * Prebook the offer of the search. LiteAPI rate ids only live for a short time
 * and prices move (the search may also come from the rate cache); an answer of
 * 4xx means the supplier no longer sells that rate ("please search again").
 * Then the same tariff is quoted again and that one is prebooked, at most
 * BOOKING_MAX_REQUOTES times. A different price reaches the guest through the
 * price confirmation, a tariff that is gone as "not available". Outages of the
 * supplier are never read as "not available".
 */
async function prebookFresh(deps: BookingDeps, offer: BookableOffer, occupancy: readonly Occupancy[]): Promise<PayablePrebook> {
  let liteapiOfferId = offer.liteapiOfferId;
  for (let requotes = 0; ; requotes += 1) {
    try {
      return await prebookOnce(deps, liteapiOfferId);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logWarn('prebook failed', { ...providerFields(err), requotes });
      if (!(err instanceof ProviderError) || err.kind !== 'client') throw new ApiError(503, 'provider_unavailable', BOOKING_TEXTS.providerUnavailable);
      if (requotes >= constants.BOOKING_MAX_REQUOTES) throw new ApiError(409, 'offer_unavailable', BOOKING_TEXTS.offerUnavailable);
    }
    liteapiOfferId = await requote(deps, offer, occupancy);
  }
}

const accessUrl = (deps: BookingDeps, ref: string, token: string) => `${deps.origin}/buchung/${ref}#a=${token}`;

export async function createBooking(deps: BookingDeps, req: BookingCreateRequest): Promise<BookingCreateResponse> {
  if (!deps.bookingEnabled) throw new ApiError(503, 'booking_disabled', BOOKING_TEXTS.disabled);
  const search = await getSearch(deps.db, req.search_id);
  if (!search || !constantTimeEqual(search.tokenHash, await sha256Hex(req.search_token))) {
    throw new ApiError(404, 'not_found', 'Diese Suche gibt es nicht oder der Link ist ungültig.');
  }
  const offer = await getBookableOffer(deps.db, search.id, req.offer_id);
  if (!offer) throw new ApiError(404, 'not_found', BOOKING_TEXTS.offerNotFound);
  const request = searchRequestSchema.parse(search.request);
  const occupancy = splitOccupancy(request.occupancy.rooms, request.occupancy.adults, request.occupancy.children_ages);
  const rooms = occupancy?.length ?? 0;
  const guestRooms = new Set(req.guests.map((g) => g.room));
  if (!occupancy || req.guests.length !== rooms || guestRooms.size !== rooms || [...guestRooms].some((r) => r > rooms)) {
    throw new ApiError(400, 'guests_invalid', BOOKING_TEXTS.guestsInvalid);
  }

  const draft = await createBookingDraft(
    deps.db,
    {
      searchId: search.id,
      hotelId: offer.hotelId,
      offer: {
        offerRowId: offer.id,
        liteapiOfferId: offer.liteapiOfferId,
        hotelName: offer.hotelName,
        placeName: offer.placeName,
        roomName: offer.roomName,
        boardType: offer.boardType,
        refundable: offer.refundable,
        freeCancelUntil: offer.freeCancelUntil,
        totalCents: offer.totalCents,
        payAtPropertyCents: offer.payAtPropertyCents,
        payAtPropertyKnown: offer.payAtPropertyKnown,
        nights: offer.nights,
      },
      checkin: offer.checkin,
      checkout: offer.checkout,
      occupancy,
      totalCents: offer.totalCents,
      currency: offer.currency,
      cancellationPolicy: { refundable: offer.refundable, freeCancelUntil: offer.freeCancelUntil },
      holder: { firstName: req.holder.first_name, lastName: req.holder.last_name, email: req.holder.email, phone: req.holder.phone },
      guests: req.guests.map((g) => ({ room: g.room, firstName: g.first_name, lastName: g.last_name })),
    },
    refGenerator(deps),
  );

  let prebook: PayablePrebook;
  try {
    prebook = await prebookFresh(deps, offer, occupancy);
  } catch (err) {
    await applyBookingEvent(deps.db, draft.id, 'prebook_failed', { lastError: err instanceof ApiError ? err.code : 'error' });
    throw err;
  }
  const priceChanged = prebook.totalCents !== offer.totalCents;
  const moved = await applyBookingEvent(deps.db, draft.id, 'prebook_ok', {
    prebookId: prebook.prebookId,
    transactionId: prebook.transactionId,
    totalCents: prebook.totalCents,
    currency: prebook.currency,
    priceChanged,
  });
  if (!moved.ok) throw new ApiError(409, 'invalid_state', BOOKING_TEXTS.invalidState);
  const sessionToken = await signToken(deps.signingKey, {
    bookingId: draft.id,
    purpose: 'session',
    expiresAt: new Date(deps.now().getTime() + constants.BOOKING_SESSION_TOKEN_TTL_S * 1000),
  });
  return {
    booking_ref: draft.bookingRef,
    session_token: sessionToken,
    price: { total_eur: eur(prebook.totalCents), currency: prebook.currency },
    previous_price: { total_eur: eur(offer.totalCents), currency: offer.currency },
    price_changed: priceChanged,
    payment: {
      secret_key: prebook.secretKey,
      mode: deps.paymentMode,
      simulated: deps.simulatedPayment,
      return_url: `${deps.origin}/buchung/${draft.bookingRef}/abschluss`,
    },
  };
}

export async function confirmPrice(deps: BookingDeps, ref: string, sessionToken: string) {
  const booking = await authorize(deps, ref, sessionToken, 'session');
  if (!(await confirmBookingPrice(deps.db, booking.id, deps.now()))) throw new ApiError(409, 'invalid_state', BOOKING_TEXTS.invalidState);
  return { booking_ref: booking.bookingRef, price: { total_eur: eur(booking.totalCents), currency: booking.currency }, confirmed: true as const };
}

async function confirmationPayload(deps: BookingDeps, b: Booking, token: string) {
  return {
    bookingRef: b.bookingRef,
    hotelName: b.offer.hotelName,
    placeName: b.offer.placeName,
    checkin: b.checkin,
    checkout: b.checkout,
    nights: b.offer.nights,
    roomName: b.offer.roomName,
    boardLabel: BOARD_LABELS[b.offer.boardType] ?? b.offer.boardType,
    guests: b.occupancy.reduce((s, o) => s + o.adults + o.childrenAges.length, 0),
    totalCents: b.totalCents,
    currency: b.currency,
    payAtPropertyCents: b.offer.payAtPropertyCents,
    payAtPropertyKnown: b.offer.payAtPropertyKnown,
    refundable: b.cancellationPolicy?.refundable ?? b.offer.refundable,
    freeCancelUntil: b.cancellationPolicy?.freeCancelUntil ?? b.offer.freeCancelUntil,
    hotelConfirmationCode: b.hotelConfirmationCode,
    accessUrl: accessUrl(deps, b.bookingRef, token),
  };
}

/** After the payment: books exactly once; repeated calls return the stored result. */
export async function completeBooking(deps: BookingDeps, ref: string, sessionToken: string): Promise<BookingCompleteResponse> {
  const booking = await authorize(deps, ref, sessionToken, 'session');
  const decision = decideComplete(booking.status, booking.priceChanged, booking.priceConfirmedAt !== null);
  if (decision.action === 'return_confirmed') return { booking: bookingView(booking, deps.now()), access_token: await accessToken(deps, booking) };
  if (decision.action === 'retry_later') throw new ApiError(409, 'booking_in_progress', BOOKING_TEXTS.inProgress, undefined, { 'Retry-After': '3' });
  if (decision.action === 'confirm_price_first') throw new ApiError(409, 'price_confirmation_required', BOOKING_TEXTS.priceConfirmationRequired);
  if (decision.action === 'reject') throw new ApiError(409, 'invalid_state', BOOKING_TEXTS.invalidState, { status: booking.status });

  // Claim the booking under a row lock; a concurrent call sees `booking`.
  const claimed = await applyBookingEvent(deps.db, booking.id, 'payment_returned');
  if (!claimed.ok) {
    if (claimed.state === 'confirmed') {
      const current = (await getBookingById(deps.db, booking.id)) as Booking;
      return { booking: bookingView(current, deps.now()), access_token: await accessToken(deps, current) };
    }
    throw new ApiError(409, 'booking_in_progress', BOOKING_TEXTS.inProgress, undefined, { 'Retry-After': '3' });
  }
  const b = claimed.booking;
  if (!b.prebookId || !b.transactionId || !b.holder || !b.guests) {
    await applyBookingEvent(deps.db, b.id, 'book_failed', { lastError: 'incomplete_booking' });
    throw new ApiError(409, 'booking_failed', BOOKING_TEXTS.bookFailed);
  }
  let result;
  try {
    result = await deps.liteapi.book({
      prebookId: b.prebookId,
      transactionId: b.transactionId,
      holder: b.holder,
      guests: b.guests.map((g) => ({ occupancyNumber: g.room, firstName: g.firstName, lastName: g.lastName, email: b.holder!.email })),
      clientReference: b.bookingRef,
    });
  } catch (err) {
    await applyBookingEvent(deps.db, b.id, 'book_failed', { lastError: err instanceof ProviderError ? `${err.kind}:${err.status ?? ''}` : 'error' });
    throw new ApiError(409, 'booking_failed', BOOKING_TEXTS.bookFailed);
  }
  if (result.status === 'FAILED' || result.status === 'CANCELLED') {
    await applyBookingEvent(deps.db, b.id, 'book_failed', { lastError: `status:${result.status}` });
    throw new ApiError(409, 'booking_failed', BOOKING_TEXTS.bookFailed);
  }
  const confirmed = await applyBookingEvent(deps.db, b.id, 'book_ok', {
    liteapiBookingId: result.bookingId,
    hotelConfirmationCode: result.hotelConfirmationCode,
    confirmedAt: deps.now(),
  });
  if (!confirmed.ok) throw new ApiError(409, 'invalid_state', BOOKING_TEXTS.invalidState);
  const token = (await accessToken(deps, confirmed.booking)) as string;
  await sendViaOutbox(
    { db: deps.db, mail: deps.mail, now: deps.now },
    { type: 'booking_confirmation', toEmail: b.holder.email, bookingId: b.id, payload: await confirmationPayload(deps, confirmed.booking, token) },
  );
  return { booking: bookingView(confirmed.booking, deps.now()), access_token: token };
}

export async function viewBooking(deps: BookingDeps, ref: string, token: string): Promise<BookingView> {
  return bookingView(await authorize(deps, ref, token, 'access'), deps.now());
}

export async function cancelBooking(deps: BookingDeps, ref: string, token: string, dryRun: boolean): Promise<CancelResponse> {
  const booking = await authorize(deps, ref, token, 'access');
  const view = bookingView(booking, deps.now());
  if (!view.can_cancel || !booking.liteapiBookingId) throw new ApiError(409, 'not_cancellable', BOOKING_TEXTS.notCancellable);
  const policy = { refundable: view.cancellation.refundable, freeCancelUntil: view.cancellation.free_cancel_until };
  if (dryRun) {
    const p = cancellationPreview(policy, booking.totalCents, deps.now());
    return { dry_run: true, preview: { kind: p.kind, fee_eur: p.feeCents === null ? null : eur(p.feeCents), refund_eur: p.refundCents === null ? null : eur(p.refundCents) } };
  }
  let result;
  try {
    result = await deps.liteapi.cancelBooking(booking.liteapiBookingId);
  } catch {
    throw new ApiError(502, 'cancel_failed', BOOKING_TEXTS.cancelFailed);
  }
  const cancelled = await applyBookingEvent(deps.db, booking.id, 'cancel_ok', {
    cancelledAt: deps.now(),
    cancellationFeeCents: result.cancellationFeeCents,
    refundCents: result.refundCents,
  });
  if (!cancelled.ok) throw new ApiError(409, 'not_cancellable', BOOKING_TEXTS.notCancellable);
  if (booking.holder) {
    await sendViaOutbox(
      { db: deps.db, mail: deps.mail, now: deps.now },
      {
        type: 'booking_cancelled',
        toEmail: booking.holder.email,
        bookingId: booking.id,
        payload: {
          bookingRef: booking.bookingRef,
          hotelName: booking.offer.hotelName,
          checkin: booking.checkin,
          checkout: booking.checkout,
          feeCents: result.cancellationFeeCents,
          refundCents: result.refundCents,
          currency: result.currency ?? booking.currency,
        },
      },
    );
  }
  return { dry_run: false, booking: bookingView(cancelled.booking, deps.now()) };
}

/** Sends a fresh access link when reference and e-mail match; the caller always answers 202. */
export async function requestAccessLink(deps: BookingDeps, refInput: string, email: string): Promise<boolean> {
  const ref = normalizeBookingRef(refInput);
  if (!ref) return false;
  const booking = await getBookingByRef(deps.db, ref);
  if (!booking?.holder || booking.holder.email.trim().toLowerCase() !== email.trim().toLowerCase()) return false;
  if (booking.status !== 'confirmed' && booking.status !== 'cancelled') return false;
  const token = (await accessToken(deps, booking)) as string;
  await sendViaOutbox(
    { db: deps.db, mail: deps.mail, now: deps.now },
    {
      type: 'access_link',
      toEmail: booking.holder.email,
      bookingId: booking.id,
      payload: { bookingRef: booking.bookingRef, hotelName: booking.offer.hotelName, accessUrl: accessUrl(deps, ref, token), validDays: Math.round(constants.BOOKING_ACCESS_TOKEN_TTL_S / 86_400) },
    },
  );
  return true;
}
