// Public reference price of one offer, loaded on demand (each request may be
// a paid provider call and is limited per minute). Neutral wording only: no
// savings claims (claims rule, architektur.md 6.13).
import { useState } from 'react';
import type { ReferencePriceResponse } from '@reiseplaner/contracts';
import { ApiRequestError } from '../../api/client';
import { de } from '../../i18n/de';
import { formatEuro, formatTime } from '../../lib/format';
import { fetchReferencePrice } from './api';

const t = de.detail;

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; data: ReferencePriceResponse } | { kind: 'error'; message: string };

export function ReferencePrice({ searchId, token, hotelId, offerId }: { searchId: string; token: string; hotelId: string; offerId: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function load() {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'done', data: await fetchReferencePrice(searchId, token, hotelId, offerId) });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof ApiRequestError && err.status === 429 ? t.referenceRateLimited : t.referenceBusy });
    }
  }

  if (state.kind === 'idle') {
    return (
      <button type="button" onClick={() => void load()} className="text-xs font-medium text-brand-700 hover:underline" data-testid="reference-show">
        {t.referenceShow}
      </button>
    );
  }
  if (state.kind === 'loading') return <p className="text-xs text-zinc-500">{t.referenceLoading}</p>;
  if (state.kind === 'error') return <p className="text-xs text-zinc-500">{state.message}</p>;
  const d = state.data;
  if (d.status === 'ok') {
    return (
      <div className="text-xs text-zinc-600" data-testid="reference-price">
        <p className="font-medium text-zinc-800">{t.referencePrice(d.source, formatEuro(d.total_price_eur))}</p>
        <p>{t.referenceNote(formatTime(d.fetched_at))}</p>
      </div>
    );
  }
  return (
    <p className="text-xs text-zinc-500" data-testid="reference-price">
      {d.reason === 'contract_unverified' ? t.referenceNotYet : d.reason === 'no_public_price' ? t.referenceNone : t.referenceBusy}
    </p>
  );
}
