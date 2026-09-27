import { useEffect, useState } from 'react';
import { healthResponseSchema, type HealthResponse } from '@reiseplaner/contracts';
import { cx } from '@reiseplaner/ui';
import { apiRequest } from '../api/client';
import { de } from '../i18n/de';

type State = { kind: 'checking' } | { kind: 'ok'; health: HealthResponse } | { kind: 'api-down' };

/** "API: ok · Datenbank: ok" — the walking skeleton's end-to-end proof (S1.4). */
export function StatusLine({ className }: { className?: string }) {
  const [state, setState] = useState<State>({ kind: 'checking' });
  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/health', healthResponseSchema, { signal: controller.signal, acceptStatuses: [503] })
      .then((health) => setState({ kind: 'ok', health }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: 'api-down' });
      });
    return () => controller.abort();
  }, []);

  const t = de.status;
  const api = state.kind === 'checking' ? t.checking : state.kind === 'ok' ? t.ok : t.down;
  const db =
    state.kind === 'checking' ? t.checking : state.kind === 'ok' ? (state.health.db === 'ok' ? t.ok : t.down) : t.unknown;
  const healthy = state.kind === 'ok' && state.health.db === 'ok';
  return (
    <div className={cx('space-y-2', className)}>
      <p
        data-testid="status-line"
        aria-label={t.label}
        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-zinc-600 ring-1 ring-zinc-200"
      >
        <span
          aria-hidden="true"
          className={cx(
            'size-2 rounded-full',
            state.kind === 'checking' ? 'bg-zinc-300' : healthy ? 'bg-emerald-500' : 'bg-red-500',
          )}
        />
        {`${t.api}: ${api} · ${t.db}: ${db}`}
        {state.kind === 'ok' ? <span className="text-zinc-400">({state.health.version})</span> : null}
      </p>
      {state.kind === 'api-down' ? <p className="text-sm text-red-700">{t.apiUnreachable}</p> : null}
    </div>
  );
}
