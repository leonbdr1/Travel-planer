// Return from the payment (returnUrl): completes the booking once and shows
// the confirmation with booking number and the hotel's confirmation number
// (F12, konzept.md 5.1 example 5). A running completion is retried.
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { BookingView } from '@reiseplaner/contracts';
import { Alert, Card, Heading, Spinner, Text, buttonClasses } from '@reiseplaner/ui';
import { ApiRequestError } from '../api/client';
import { completeBooking } from '../features/booking/api';
import { loadFlow, saveFlow } from '../features/booking/session';
import { de } from '../i18n/de';
import { BookingFacts } from './BookingView';

const t = de.booking;
const RETRY_MS = 3_000;
const MAX_TRIES = 6;

export function BookingReturn() {
  const { ref = '' } = useParams();
  const flow = loadFlow(ref);
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(flow?.accessToken ?? null);
  const [error, setError] = useState<string | null>(flow ? null : t.sessionMissing);
  const started = useRef(false);

  useEffect(() => {
    if (!flow || started.current) return;
    started.current = true;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => {
      tries += 1;
      completeBooking(ref, flow.create.session_token)
        .then((res) => {
          setBooking(res.booking);
          if (res.access_token) {
            setAccessToken(res.access_token);
            saveFlow({ ...flow, accessToken: res.access_token });
          }
        })
        .catch((err: unknown) => {
          if (err instanceof ApiRequestError && err.code === 'booking_in_progress' && tries < MAX_TRIES) {
            timer = setTimeout(attempt, RETRY_MS);
            return;
          }
          setError(err instanceof ApiRequestError ? err.message : de.status.apiUnreachable);
        });
    };
    attempt();
    return () => clearTimeout(timer);
  }, [ref, flow]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-12">
        <Heading level={1}>{t.failedTitle}</Heading>
        <Alert tone="error">{error}</Alert>
        <Link to="/suche" className={buttonClasses('secondary')}>
          {de.searchRun.newSearch}
        </Link>
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Spinner label={t.completing} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6" data-testid="booking-confirmed">
      <Heading level={1}>{t.confirmedTitle}</Heading>
      <Text>{t.confirmedLead(booking.holder?.email_masked ?? '')}</Text>
      <Card className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">{t.bookingRef}</dt>
            <dd className="font-mono text-2xl font-bold text-zinc-950" data-testid="booking-ref">
              {booking.booking_ref}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">{t.hotelCode}</dt>
            <dd className="font-mono text-2xl font-bold text-zinc-950" data-testid="hotel-confirmation">
              {booking.hotel_confirmation_code ?? t.hotelCodePending}
            </dd>
          </div>
        </dl>
        <BookingFacts booking={booking} />
        <Text className="text-sm">{t.contractPartner(booking.hotel.name)}</Text>
      </Card>
      {accessToken ? (
        <Link to={`/buchung/${booking.booking_ref}#a=${accessToken}`} className={buttonClasses('primary')} data-testid="view-booking">
          {t.viewBooking}
        </Link>
      ) : null}
    </div>
  );
}
