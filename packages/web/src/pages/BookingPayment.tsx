// Payment step (architektur.md 3.4, 8.1). Fake mode simulates the LiteAPI
// payment SDK: the button returns to the return URL like the SDK would.
// ⟂ The real SDK (sandbox/live) is not wired yet: its script API and CSP
// domains are verified with the first sandbox access (S8.4, HANDOFF).
import { Link, useNavigate, useParams } from 'react-router';
import { Alert, Button, Card, Heading, Text } from '@reiseplaner/ui';
import { loadFlow } from '../features/booking/session';
import { de } from '../i18n/de';
import { formatEuroCents } from '../lib/format';

const t = de.booking;

export function BookingPayment() {
  const { ref = '' } = useParams();
  const navigate = useNavigate();
  const flow = loadFlow(ref);
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
        ) : (
          <Alert tone="warning">{t.paymentSdkPending}</Alert>
        )}
      </Card>
    </div>
  );
}
