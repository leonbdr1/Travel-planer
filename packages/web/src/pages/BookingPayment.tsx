// Payment step (architektur.md 3.4, 8.1). Fake mode simulates the LiteAPI
// payment SDK: the button returns to the return URL like the SDK would.
// Sandbox and live mount the real SDK (features/booking/payment-sdk.ts).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Alert, Button, Card, Heading, Text } from '@reiseplaner/ui';
import { mountPaymentSdk } from '../features/booking/payment-sdk-mount';
import { loadFlow } from '../features/booking/session';
import { de } from '../i18n/de';
import { formatEuroCents } from '../lib/format';

const t = de.booking;

export function BookingPayment() {
  const { ref = '' } = useParams();
  const navigate = useNavigate();
  const flow = loadFlow(ref);
  const [sdkError, setSdkError] = useState(false);
  const mounted = useRef(false);
  const useSdk = flow !== null && !flow.create.payment.simulated;
  useEffect(() => {
    if (!flow || !useSdk || mounted.current) return;
    mounted.current = true;
    mountPaymentSdk(flow.create, '#payment-element').catch(() => setSdkError(true));
  }, [flow, useSdk]);
  if (!flow) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-12">
        <Alert tone="error">{t.sessionMissing}</Alert>
        <Link to="/suche" className="text-sm font-medium text-brand-700 hover:underline">
          {de.searchRun.newSearch}
        </Link>
      </div>
    );
  }
  const { create } = flow;
  const returnPath = new URL(create.payment.return_url).pathname;
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <Heading level={1}>{t.paymentTitle}</Heading>
      <Text>{t.paymentLead(formatEuroCents(create.price.total_eur))}</Text>
      <Card className="space-y-3" data-testid="payment">
        <p className="text-sm text-zinc-600">
          {t.bookingRef}: <span className="font-semibold text-zinc-900">{create.booking_ref}</span> · {flow.hotelName}
        </p>
        {create.payment.simulated ? (
          <>
            <Heading level={2}>{t.paymentSimulatedTitle}</Heading>
            <Text className="text-sm">{t.paymentSimulated}</Text>
            <Button size="lg" onClick={() => navigate(returnPath)} data-testid="simulated-pay">
              {t.paymentSimulatedButton}
            </Button>
          </>
        ) : sdkError ? (
          <Alert tone="error">{t.paymentSdkFailed}</Alert>
        ) : (
          <div id="payment-element" data-testid="payment-element" />
        )}
      </Card>
    </div>
  );
}
