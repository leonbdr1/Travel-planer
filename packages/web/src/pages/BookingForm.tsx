// Booking form (F11): offer summary, holder and one guest per room, the two
// required acknowledgements, amounts due at the property; on submit the
// offer is prebooked. A changed price must be confirmed before payment.
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { productConfig } from '@reiseplaner/config';
import type { BookingCreateResponse, HotelDetailResponse, OfferDto } from '@reiseplaner/contracts';
import { Alert, Button, Card, Checkbox, Dialog, Fieldset, Heading, Input, Label, Spinner, Text } from '@reiseplaner/ui';
import { ApiRequestError } from '../api/client';
import { confirmPrice, createBooking } from '../features/booking/api';
import { saveFlow } from '../features/booking/session';
import { loadErrorText } from '../api/load-error';
import { fetchHotelDetail } from '../features/results/api';
import { cancellationText } from '../features/results/ResultList';
import { de } from '../i18n/de';
import { formatEuroCents, formatStay } from '../lib/format';
import { useMeta } from '../lib/meta';
import { tokenFromHash } from './SearchRun';

const t = de.booking;
const r = de.results;
/** Plausible address; the API checks it again. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface GuestInput {
  first: string;
  last: string;
}

export function OfferSummary({ hotelName, offer }: { hotelName: string; offer: OfferDto }) {
  return (
    <Card className="space-y-2" data-testid="booking-summary">
      <Heading level={2}>{t.summaryTitle}</Heading>
      <p className="font-semibold text-zinc-900">{hotelName}</p>
      <Text className="text-sm">
        {offer.place_name} · {formatStay(offer.checkin, offer.checkout)} · {t.stay(offer.nights)}
      </Text>
      <Text className="text-sm">
        {offer.room_name} · {r.boardNames[offer.board_type]}
      </Text>
      <Text className="text-sm">{cancellationText(offer.refundable, offer.free_cancel_until)}</Text>
      <div className="flex items-baseline justify-between border-t border-zinc-100 pt-2">
        <span className="text-sm text-zinc-600">{t.total}</span>
        <span className="text-xl font-bold tabular-nums text-zinc-950">{formatEuroCents(offer.total_price_eur)}</span>
      </div>
      <Text className="text-xs">
        {offer.pay_at_property_known
          ? offer.pay_at_property_eur > 0
            ? t.payAtProperty(formatEuroCents(offer.pay_at_property_eur))
            : t.payAtPropertyNone
          : t.payAtPropertyUnknown}
      </Text>
    </Card>
  );
}

export function BookingForm() {
  const { searchId = '', hotelId = '', offerId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = tokenFromHash(location.hash);
  const meta = useMeta();
  const [detail, setDetail] = useState<HotelDetailResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [holder, setHolder] = useState({ first: '', last: '', email: '', phone: '' });
  const [guests, setGuests] = useState<GuestInput[]>([]);
  const [terms, setTerms] = useState(false);
  const [noWithdrawal, setNoWithdrawal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState<BookingCreateResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchHotelDetail(searchId, token, hotelId, controller.signal)
      .then((d) => {
        setDetail(d);
        setGuests(Array.from({ length: d.occupancy.rooms }, () => ({ first: '', last: '' })));
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setLoadError(loadErrorText(err, de.searchRun.notFound));
      });
    return () => controller.abort();
  }, [searchId, hotelId, token]);

  const offer = detail?.offers.find((o) => o.id === offerId) ?? null;
  const back = `/suche/${searchId}/unterkunft/${hotelId}#t=${token}`;

  function goToPayment(created: BookingCreateResponse) {
    navigate(`/buchung/${created.booking_ref}/zahlung`);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!detail || !offer) return;
    const guestNames = guests.map((g, i) => (i === 0 && !g.first && !g.last ? { first: holder.first, last: holder.last } : g));
    if (!holder.first || !holder.last || !holder.email || !terms || !noWithdrawal || guestNames.some((g) => !g.first.trim() || !g.last.trim())) {
      setError(t.required);
      return;
    }
    if (!EMAIL.test(holder.email.trim())) {
      setError(t.emailInvalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createBooking({
        search_id: searchId,
        search_token: token,
        offer_id: offer.id,
        holder: { first_name: holder.first.trim(), last_name: holder.last.trim(), email: holder.email.trim(), phone: holder.phone.trim() || null },
        guests: guestNames.map((g, i) => ({ room: i + 1, first_name: g.first, last_name: g.last })),
        accepted_terms: true,
        acknowledged_no_withdrawal: true,
      });
      saveFlow({ create: created, hotelName: detail.hotel.name, email: holder.email.trim() });
      if (created.price_changed) setChanged(created);
      else goToPayment(created);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : de.status.apiUnreachable);
    } finally {
      setBusy(false);
    }
  }

  async function acceptPrice() {
    if (!changed) return;
    setBusy(true);
    try {
      await confirmPrice(changed.booking_ref, changed.session_token);
      goToPayment(changed);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : de.status.apiUnreachable);
      setChanged(null);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <div className="mx-auto max-w-3xl px-4 py-12"><Alert tone="error">{loadError}</Alert></div>;
  if (!detail) return <div className="mx-auto max-w-3xl px-4 py-12"><Spinner label={de.common.loading} /></div>;
  if (!offer) return <div className="mx-auto max-w-3xl px-4 py-12"><Alert tone="error">{t.offerMissing}</Alert></div>;
  const bookingEnabled = meta.status !== 'ready' || meta.meta.booking_enabled;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <Link to={back} className="text-sm font-medium text-brand-700 hover:underline">
        ← {t.back}
      </Link>
      <Heading level={1}>{t.title}</Heading>
      <OfferSummary hotelName={detail.hotel.name} offer={offer} />
      {!bookingEnabled ? <Alert tone="warning">{t.disabled}</Alert> : null}
      <form className="space-y-6" onSubmit={(e) => void submit(e)} data-testid="booking-form" noValidate>
        <Card className="space-y-4">
          <Fieldset legend={t.holderTitle}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="holder-first">{t.firstName}</Label>
                <Input id="holder-first" autoComplete="given-name" value={holder.first} onChange={(e) => setHolder({ ...holder, first: e.target.value })} maxLength={100} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="holder-last">{t.lastName}</Label>
                <Input id="holder-last" autoComplete="family-name" value={holder.last} onChange={(e) => setHolder({ ...holder, last: e.target.value })} maxLength={100} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="holder-email">{t.email}</Label>
                <Input id="holder-email" type="email" autoComplete="email" value={holder.email} onChange={(e) => setHolder({ ...holder, email: e.target.value })} maxLength={254} required />
                <Text className="text-xs">{t.emailHint}</Text>
              </div>
              <div className="space-y-1">
                <Label htmlFor="holder-phone">{t.phone}</Label>
                <Input id="holder-phone" type="tel" autoComplete="tel" value={holder.phone} onChange={(e) => setHolder({ ...holder, phone: e.target.value })} maxLength={40} />
              </div>
            </div>
          </Fieldset>
          <Fieldset legend={t.guestsTitle}>
            {guests.map((g, i) => (
              <div key={i} className="grid gap-4 sm:grid-cols-2" data-testid="guest-row">
                <div className="space-y-1">
                  <Label htmlFor={`guest-${i}-first`}>
                    {t.room(i + 1)} – {t.firstName}
                  </Label>
                  <Input
                    id={`guest-${i}-first`}
                    placeholder={i === 0 ? t.sameAsHolder : ''}
                    value={g.first}
                    onChange={(e) => setGuests(guests.map((x, j) => (j === i ? { ...x, first: e.target.value } : x)))}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`guest-${i}-last`}>{t.lastName}</Label>
                  <Input
                    id={`guest-${i}-last`}
                    placeholder={i === 0 ? t.sameAsHolder : ''}
                    value={g.last}
                    onChange={(e) => setGuests(guests.map((x, j) => (j === i ? { ...x, last: e.target.value } : x)))}
                    maxLength={100}
                  />
                </div>
              </div>
            ))}
          </Fieldset>
        </Card>
        <Card className="space-y-3">
          <Fieldset legend={t.termsTitle}>
            <Checkbox
              label={t.terms(productConfig.name)}
              description={
                <Link to="/agb" className="text-brand-700 hover:underline" target="_blank">
                  {t.termsLink}
                </Link>
              }
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              data-testid="accept-terms"
            />
            <Checkbox label={t.noWithdrawal} checked={noWithdrawal} onChange={(e) => setNoWithdrawal(e.target.checked)} data-testid="accept-no-withdrawal" />
          </Fieldset>
        </Card>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Button type="submit" size="lg" disabled={busy || !bookingEnabled} data-testid="booking-submit">
          {busy ? t.submitting : t.submit}
        </Button>
      </form>
      <Dialog
        open={changed !== null}
        onClose={() => setChanged(null)}
        title={t.priceChangedTitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => setChanged(null)}>
              {t.priceCancel}
            </Button>
            <Button onClick={() => void acceptPrice()} disabled={busy} data-testid="price-confirm">
              {t.priceConfirm}
            </Button>
          </>
        }
      >
        {changed ? t.priceChanged(formatEuroCents(changed.previous_price.total_eur), formatEuroCents(changed.price.total_eur)) : null}
      </Dialog>
    </div>
  );
}
