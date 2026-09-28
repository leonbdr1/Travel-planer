// Developer page (S11.8, /entwickler): the AI switch for local tests, today's
// AI spend and the local search limits. Only served in dev; elsewhere the API
// answers 404 and the page says so.
import { useEffect, useState } from 'react';
import { devSettingsResponseSchema, type DevSettingsResponse } from '@reiseplaner/contracts';
import { Alert, Card, Heading, Spinner, Text, cx } from '@reiseplaner/ui';
import { apiRequest } from '../api/client';
import { de } from '../i18n/de';

const t = de.developer;
const usd = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD' });

function AiSwitch({ ai, busy, onChange }: { ai: DevSettingsResponse['ai']; busy: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ai.enabled}
      aria-label={t.aiToggle}
      disabled={busy || !ai.available}
      onClick={() => onChange(!ai.enabled)}
      className={cx(
        'relative inline-flex h-7 w-12 flex-none items-center rounded-full transition-colors disabled:opacity-50',
        ai.enabled ? 'bg-brand-700' : 'bg-zinc-300',
      )}
      data-testid="ai-switch"
    >
      <span className={cx('inline-block size-5 rounded-full bg-white shadow transition-transform', ai.enabled ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

export function Developer() {
  const [data, setData] = useState<DevSettingsResponse | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/dev/settings', devSettingsResponseSchema, { signal: controller.signal })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);

  const change = (enabled: boolean) => {
    setBusy(true);
    apiRequest('/dev/settings', devSettingsResponseSchema, { method: 'PUT', body: { ai_enabled: enabled } })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setBusy(false));
  };

  const ai = data?.ai;
  const text = !ai ? '' : !ai.available ? t.aiUnavailable : ai.source === 'fake' ? t.aiFake : ai.enabled ? t.aiRealOn : t.aiRealOff;
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6" data-testid="developer">
      <div className="space-y-1">
        <Heading level={1}>{t.title}</Heading>
        <Text>{t.lead}</Text>
      </div>
      {error ? <Alert tone="info">{t.unavailable}</Alert> : null}
      {!data && !error ? <Spinner label={de.common.loading} /> : null}
      {data && ai ? (
        <>
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Heading level={2}>{t.aiTitle}</Heading>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-700" data-testid="ai-state">
                  {ai.enabled ? t.aiOn : t.aiOff}
                </span>
                <AiSwitch ai={ai} busy={busy} onChange={change} />
              </div>
            </div>
            <Text className="text-sm">{text}</Text>
            {ai.source === 'real' ? (
              <p className="text-sm text-zinc-600" data-testid="ai-spent">
                {t.aiSpent(usd.format(ai.spent_today_usd), usd.format(ai.daily_budget_usd))}
              </p>
            ) : null}
            <p className="text-xs text-zinc-500">{t.aiNext}</p>
          </Card>
          <Card className="space-y-2">
            <Heading level={2}>{t.limitsTitle}</Heading>
            <Text className="text-sm">{t.limits(data.limits.searches_per_hour, data.limits.searches_per_day)}</Text>
          </Card>
        </>
      ) : null}
    </div>
  );
}
