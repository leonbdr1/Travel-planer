// When the prices were fetched, and (B3) the same search again with fresh
// prices: rate ids and prices only live for a while (RATE_CACHE_TTL_MIN), after
// that the list shows old prices. The new search goes through ALTCHA and the
// rate limits like any other.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { SearchRequest, SearchResultsResponse } from '@reiseplaner/contracts';
import { constants } from '@reiseplaner/domain';
import { Alert, Button } from '@reiseplaner/ui';
import { ApiRequestError } from '../../api/client';
import { de } from '../../i18n/de';
import { formatTime } from '../../lib/format';
import { recentLabel, rememberSearch } from '../search/recent';
import { startSearch } from '../search/run-api';

const t = de.results;

export function startErrorText(err: unknown): string {
  const e = de.searchRun.errors;
  if (err instanceof ApiRequestError && err.status === 429) return e.rate_limited;
  if (err instanceof ApiRequestError && err.status === 402) return e.quota;
  if (err instanceof ApiRequestError && err.code !== 'http_error') return err.message;
  return e.generic;
}

export function PriceFreshness({
  fetchedAt,
  request,
  places,
  now = new Date(),
}: {
  fetchedAt: string | null;
  request: SearchRequest;
  places: SearchResultsResponse['matrix']['places'];
  now?: Date;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!fetchedAt) return null;
  const stale = now.getTime() - Date.parse(fetchedAt) > constants.RATE_CACHE_TTL_MIN * 60_000;

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const created = await startSearch(request);
      rememberSearch({ id: created.search_id, token: created.token, label: recentLabel(places.map((p) => p.name), request.window), createdAt: new Date().toISOString() });
      navigate(`/suche/${created.search_id}#t=${created.token}`);
    } catch (err) {
      setBusy(false);
      setError(startErrorText(err));
    }
  }

  const button = (
    <Button variant={stale ? 'primary' : 'ghost'} size="sm" disabled={busy} onClick={() => void refresh()} data-testid="refresh-prices">
      {busy ? de.searchRun.starting : t.refresh}
    </Button>
  );
  return (
    <div className="space-y-2" data-testid="fetched-at" data-stale={stale || undefined}>
      {stale ? (
        <Alert tone="warning">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {t.stale(formatTime(fetchedAt))}
            {button}
          </span>
        </Alert>
      ) : (
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
          {t.fetchedAt(formatTime(fetchedAt))}
          {button}
        </p>
      )}
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
