// "Meine Buchung": request an access link by booking number and e-mail
// (ALTCHA in the browser). The answer never reveals whether a booking exists.
import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, Heading, Input, Label, Text } from '@reiseplaner/ui';
import { ApiRequestError } from '../api/client';
import { requestAccessLink } from '../features/booking/api';
import { de } from '../i18n/de';

const t = de.booking;

export function MyBooking() {
  const [ref, setRef] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ref.trim() || !email.trim()) {
      setError(t.required);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestAccessLink(ref.trim(), email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : de.status.apiUnreachable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-10 sm:px-6">
      <Heading level={1}>{t.myTitle}</Heading>
      <Text>{t.myLead}</Text>
      <Card>
        {sent ? (
          <Alert tone="success">
            <span data-testid="access-link-sent">{t.mySent}</span>
          </Alert>
        ) : (
          <form className="space-y-4" onSubmit={(e) => void submit(e)} data-testid="access-link-form" noValidate>
            <div className="space-y-1">
              <Label htmlFor="my-ref">{t.myRef}</Label>
              <Input id="my-ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t.myRefPlaceholder} maxLength={20} autoComplete="off" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="my-email">{t.email}</Label>
              <Input id="my-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" />
            </div>
            <Text className="text-xs">{t.mySecurity}</Text>
            {error ? <Alert tone="error">{error}</Alert> : null}
            <Button type="submit" disabled={busy} data-testid="access-link-submit">
              {busy ? t.mySubmitting : t.mySubmit}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
