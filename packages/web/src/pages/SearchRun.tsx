// Search progress (F4): polls GET /searches/{id} every STATUS_POLL_INTERVAL_MS,
// shows "x von y Kombinationen" and fills the matrix live. The search token
// lives in the URL fragment (never sent in request lines or logs).
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import type { SearchProgressResponse } from '@reiseplaner/contracts';
import { constants } from '@reiseplaner/domain';
import { Alert, buttonClasses, Card, Heading, ProgressBar, Spinner, Text } from '@reiseplaner/ui';
import { ApiRequestError } from '../api/client';
import { Matrix } from '../features/search/Matrix';
import { ResultsView } from '../features/results/ResultsView';
import { forgetSearch } from '../features/search/recent';
import { fetchProgress } from '../features/search/run-api';
import { de } from '../i18n/de';

const t = de.searchRun;
const FINAL = new Set(['done', 'partial', 'failed']);
const RECONNECT_NOTICE_AFTER = 3;

export function tokenFromHash(hash: string): string {
  return new URLSearchParams(hash.replace(/^#/, '')).get('t') ?? '';
}

export function SearchRun() {
  const { id = '' } = useParams();
  const location = useLocation();
  const token = tokenFromHash(location.hash);
  const [progress, setProgress] = useState<SearchProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Consecutive failed polls (offline, server busy): after a few the page says so and keeps trying.
  const [failures, setFailures] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    // Another search or a corrected link (only the fragment changed): start over.
    setError(null);
    setFailures(0);
    const poll = async () => {
      try {
        const p = await fetchProgress(id, token, controller.signal);
        if (stopped) return;
        setProgress(p);
        setFailures(0);
        if (!FINAL.has(p.search.status)) timer = setTimeout(poll, constants.STATUS_POLL_INTERVAL_MS);
      } catch (err) {
        if (stopped) return;
        if (err instanceof ApiRequestError && err.status === 404) {
          // Deleted after the retention period or a wrong link: no longer a "last search".
          forgetSearch(id);
          setError(t.notFound);
        }
        else {
          setFailures((n) => n + 1);
          timer = setTimeout(poll, constants.STATUS_POLL_INTERVAL_MS * 2);
        }
      }
    };
    void poll();
    return () => {
      stopped = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [id, token]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Alert tone="error">{error}</Alert>
      </div>
    );
  }
  const reconnecting = failures >= RECONNECT_NOTICE_AFTER ? (
    <div data-testid="reconnecting">
      <Alert tone="warning">{de.status.reconnecting}</Alert>
    </div>
  ) : null;
  if (!progress) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-12">
        {reconnecting}
        <Spinner label={de.common.loading} />
      </div>
    );
  }
  const s = progress.search;
  const handled = s.combos_done + s.combos_failed;
  const final = FINAL.has(s.status);
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div className="space-y-3">
        <Heading level={1}>{s.status === 'failed' ? t.failedTitle : final ? t.doneTitle : t.progressTitle}</Heading>
        <Card className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Text className="font-semibold text-zinc-900" data-testid="search-progress">
              {t.progress(handled, s.combos_total)}
            </Text>
            <Text className="text-sm">{t.offers(progress.offers_count)}</Text>
          </div>
          <ProgressBar value={handled} max={s.combos_total} label={t.progress(handled, s.combos_total)} />
        </Card>
        {s.status === 'reviewing' ? (
          <div data-testid="reviewing">
            <Alert tone="info">{t.reviewing}</Alert>
          </div>
        ) : null}
        {reconnecting}
        {s.status === 'partial' ? <Alert tone="warning">{t.partial}</Alert> : null}
        {s.status === 'failed' ? <Alert tone="error">{t.failed}</Alert> : null}
      </div>
      {final && s.status !== 'failed' ? (
        <ResultsView searchId={s.id} token={token} />
      ) : (
        <section className="space-y-3">
          <Heading level={2}>{t.matrixTitle}</Heading>
          <Matrix places={progress.places} dates={progress.dates} cells={progress.cells} />
        </section>
      )}
      <Link to="/suche" className={buttonClasses('secondary')}>
        {t.newSearch}
      </Link>
    </div>
  );
}
