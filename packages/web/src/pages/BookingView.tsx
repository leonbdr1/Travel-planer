// Booking view with the access token from the e-mail link (#a=…): details,
// status and cancellation with a cost preview (F13).
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import type { BookingView as BookingViewDto } from '@reiseplaner/contracts';
import { Alert, Badge, Button, Card, Dialog, Heading, Spinner, Text } from '@reiseplaner/ui';
import { ApiRequestError } from '../api/client';
import { cancelBooking, fetchBooking } from '../features/booking/api';
import { cancellationText } from '../features/results/ResultList';
import { de } from '../i18n/de';
import { formatEuroCents, formatStay } from '../lib/format';

const t = de.booking;
const r = de.results;

export function accessTokenFromHash(hash: string): string {
  return new URLSearchParams(hash.replace(/^#/, '')).get('a') ?? '';
}

export function BookingFacts({ booking }: { booking: BookingViewDto }) {
  const rows: Array<[string, string]> = [
    [de.results.total, formatEuroCents(booking.total_eur)],
    ['', `${booking.hotel.name}, ${booking.hotel.place_name}`],
    ['', `${formatStay(booking.checkin, booking.checkout)} · ${t.stay(booking.nights)}`],
    ['', `${booking.room_name} · ${r.boardNames[booking.board_type as keyof typeof r.boardNames] ?? booking.board_type}`],
    ['', t.guestLine(booking.rooms, booking.guests)],
  ];
  return (
    <div className="space-y-1 text-sm text-zinc-700" data-testid="booking-facts">
      {rows.map(([label, value], i) => (
        <p key={i}>
          {label ? <span className="text-zinc-500">{label}: </span> : null}
          <span className={label ? 'font-semibold text-zinc-900' : ''}>{value}</span>
        </p>
      ))}
      <p>{cancellationText(booking.cancellation.refundable, booking.cancellation.free_cancel_until)}</p>
      <p className="text-xs text-zinc-500">
        {booking.pay_at_property_known
          ? booking.pay_at_property_eur > 0
            ? t.payAtProperty(formatEuroCents(booking.pay_at_property_eur))
            : t.payAtPropertyNone
          : t.payAtPropertyUnknown}
      </p>
    </div>
  );
}

type Preview = { kind: 'free' | 'full' | 'fee_unknown'; fee_eur: number | null; refund_eur: number | null };

export function BookingView() {
  const { ref = '' } = useParams();
  const location = useLocation();
  const token = accessTokenFromHash(location.hash);
  const [booking, setBooking] = useState<BookingViewDto | null>(null);
  const [error, setError] = useState<string | null>(token ? null : t.tokenInvalid);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetchBooking(ref, token, controller.signal)
      .then(setBooking)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof ApiRequestError && err.status === 403 ? t.tokenInvalid : de.status.apiUnreachable);
      });
    return () => controller.abort();
  }, [ref, token]);

  async function askCancel() {
    setBusy(true);
    try {
      const res = await cancelBooking(ref, token, true);
      if (res.dry_run) setPreview(res.preview);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : de.status.apiUnreachable);
    } finally {
      setBusy(false);
    }
  }

  async function doCancel() {
    setBusy(true);
    try {
      const res = await cancelBooking(ref, token, false);
      if (!res.dry_run) setBooking(res.booking);
      setPreview(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : de.status.apiUnreachable);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  if (error && !booking) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-12">
        <Heading level={1}>{t.viewTitle}</Heading>
        <Alert tone="error">{error}</Alert>
        <Link to="/buchung" className="text-sm font-medium text-brand-700 hover:underline">
          {t.myTitle}
        </Link>
      </div>
    );
  }
  if (!booking) return <div className="mx-auto max-w-2xl px-4 py-12"><Spinner label={de.common.loading} /></div>;

  const previewText = preview
    ? preview.kind === 'free'
      ? t.cancelFree(formatEuroCents(preview.refund_eur ?? 0))
      : preview.kind === 'full'
        ? t.cancelFull(formatEuroCents(preview.fee_eur ?? booking.total_eur))
        : t.cancelFeeUnknown
    : '';
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6" data-testid="booking-view">
      <div className="flex flex-wrap items-center gap-3">
        <Heading level={1}>{t.viewTitle}</Heading>
        <Badge tone={booking.status === 'confirmed' ? 'bargain' : booking.status === 'cancelled' ? 'neutral' : 'warning'} data-testid="booking-status">
          {t.status[booking.status]}
        </Badge>
      </div>
      <Card className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">{t.bookingRef}</dt>
            <dd className="font-mono text-xl font-bold text-zinc-950">{booking.booking_ref}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">{t.hotelCode}</dt>
            <dd className="font-mono text-xl font-bold text-zinc-950">{booking.hotel_confirmation_code ?? t.hotelCodePending}</dd>
          </div>
        </dl>
        <BookingFacts booking={booking} />
        {booking.holder ? (
          <Text className="text-sm">
            {t.holder}: {booking.holder.first_name} {booking.holder.last_name} ({booking.holder.email_masked})
          </Text>
        ) : null}
        <Text className="text-sm">{t.contractPartner(booking.hotel.name)}</Text>
      </Card>
      <Card className="space-y-3">
        <Heading level={2}>{t.cancellationTitle}</Heading>
        {booking.status === 'cancelled' ? (
          <Text className="text-sm" data-testid="cancelled-note">
            {booking.cancellation_fee_eur !== null && booking.refund_eur !== null
              ? t.cancelled(formatEuroCents(booking.cancellation_fee_eur), formatEuroCents(booking.refund_eur))
              : t.cancelledUnknown}
          </Text>
        ) : booking.can_cancel ? (
          <Button variant="danger" onClick={() => void askCancel()} disabled={busy} data-testid="cancel-booking">
            {t.cancel}
          </Button>
        ) : (
          <Text className="text-sm">{t.notCancellable}</Text>
        )}
        {error ? <Alert tone="error">{error}</Alert> : null}
      </Card>
      <Dialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={t.cancelPreviewTitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              {t.cancelKeep}
            </Button>
            <Button variant="danger" onClick={() => void doCancel()} disabled={busy} data-testid="cancel-confirm">
              {t.cancelConfirm}
            </Button>
          </>
        }
      >
        <span data-testid="cancel-preview">{previewText}</span>
      </Dialog>
    </div>
  );
}
