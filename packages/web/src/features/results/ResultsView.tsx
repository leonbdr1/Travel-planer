// Results (F5, F7, F9, F10, F15, F16): first the finale for the traveller's
// goal, then all offers with filters prefilled from the search and
// changeable without a new search (the finale follows them), sort switch,
// matrix and list. Stars and rating minimums are "Weitere Filter": the
// pre-selection already judges quality from the reviews. Below the list the
// houses without reviews the goal's rules sort out, so the traveller can
// still pick one (Ben, 2026-09-29).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { EffectiveFilters, MatrixCellDto, ResultItem, ResultSort, SearchResultsResponse } from '@reiseplaner/contracts';
import { chipDefinition, constants, isChipCode, PROPERTY_KINDS, type Goal } from '@reiseplaner/domain';
import { Alert, Button, Card, Checkbox, Chip, Heading, Input, Label, Select, Spinner, Text } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { formatDay, formatEuro, formatStay } from '../../lib/format';
import { useMeta } from '../../lib/meta';
import { fetchResults } from './api';
import { FinaleView } from './FinaleView';
import { PriceFreshness } from './PriceFreshness';
import { PriceMatrix } from './PriceMatrix';
import { ResultList } from './ResultList';

const t = de.results;
type Sort = ResultSort;
const UNRATED_SECTION_ID = 'ohne-bewertungen';

interface FilterForm {
  budget: string;
  minStars: string;
  minRating: string;
  minReviews: string;
  refundable: boolean;
  board: string;
  /** Kinds of accommodation (hotel, pension, ferienwohnung); none = all. */
  kinds: string[];
  /** All wishes of the search; the form toggles only the facility ones, the others pass through. */
  chips: string[];
}

function formFrom(f: EffectiveFilters): FilterForm {
  return {
    budget: f.budget_total_eur === null ? '' : String(f.budget_total_eur),
    minStars: f.min_stars === null ? '' : String(f.min_stars),
    minRating: f.min_rating === null ? '' : String(f.min_rating),
    minReviews: f.min_reviews === null ? '' : String(f.min_reviews),
    refundable: f.refundable_only,
    board: f.board ?? '',
    kinds: f.property_types,
    chips: f.chips,
  };
}

/** Wishes that are facility filters (parking, dog, sauna …): these can change in the results. */
const isFacilityChip = (code: string) => isChipCode(code) && chipDefinition(code).effect.kind === 'facility';
const toggled = (list: readonly string[], value: string) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

/** Applied filters as query parameters; none before the user applies any (the search's own filters hold). */
function filterParamsFrom(form: FilterForm | null): Record<string, string> {
  if (!form) return {};
  return {
    budget: form.budget,
    min_stars: form.minStars,
    min_rating: form.minRating,
    min_reviews: form.minReviews,
    refundable: String(form.refundable),
    board: form.board,
    types: form.kinds.join(','),
    chips: form.chips.join(','),
  };
}

function paramsFrom(
  filters: Record<string, string>,
  sort: Sort,
  cell: { place_id: string; checkin: string; checkout: string | null } | null,
  goal: Goal | null,
): Record<string, string> {
  return { sort, ...filters, ...(cell ? { place_id: cell.place_id, checkin: cell.checkin, ...(cell.checkout ? { checkout: cell.checkout } : {}) } : {}), ...(goal ? { goal } : {}) };
}

export function ResultsView({ searchId, token }: { searchId: string; token: string }) {
  const meta = useMeta();
  // Price first (Ben, 2026-09-28): the cheapest acceptable house leads.
  const [sort, setSort] = useState<Sort>('price');
  // The finale's goal switch; null = the search's own goal. Matrix and list follow it.
  const [goal, setGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState<FilterForm | null>(null);
  const [applied, setApplied] = useState<FilterForm | null>(null);
  const [cell, setCell] = useState<{ place_id: string; checkin: string; checkout: string | null } | null>(null);
  const [data, setData] = useState<SearchResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchDefaults, setSearchDefaults] = useState<FilterForm | null>(null);
  // Name search: typed text, sent after a short pause; narrows the list only.
  const [nameInput, setNameInput] = useState('');
  const [name, setName] = useState('');
  // Further pages of the list ("Weitere anzeigen"), for the parameters in `pageKey`.
  const [more, setMore] = useState<ResultItem[]>([]);
  const [moreLoading, setMoreLoading] = useState(false);
  const pageKey = useRef('');
  // Memoised: the finale refetches only when the applied filters change.
  const filterParams = useMemo(() => filterParamsFrom(applied), [applied]);
  const listParams = useMemo(() => ({ ...paramsFrom(filterParams, sort, cell, goal), ...(name ? { q: name } : {}) }), [filterParams, sort, cell, goal, name]);

  useEffect(() => {
    const timer = setTimeout(() => setName(nameInput.trim()), constants.RESULTS_NAME_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [nameInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const key = JSON.stringify(listParams);
    pageKey.current = key;
    fetchResults(searchId, token, { ...listParams, limit: String(constants.RESULTS_PAGE_SIZE) }, controller.signal)
      .then((r) => {
        setData(r);
        setMore([]);
        setError(null);
        // Prefill once from the search's own filters; later answers never
        // overwrite what the user is typing.
        setForm((current) => current ?? formFrom(r.filters));
        setSearchDefaults((current) => current ?? formFrom(r.filters));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(de.status.apiUnreachable);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [searchId, token, listParams]);

  function loadMore(offset: number) {
    const key = pageKey.current;
    setMoreLoading(true);
    fetchResults(searchId, token, { ...listParams, offset: String(offset), limit: String(constants.RESULTS_PAGE_SIZE) })
      .then((r) => {
        // Parameters changed meanwhile: that page belongs to another list.
        if (pageKey.current === key) setMore((items) => [...items, ...r.items]);
      })
      .catch(() => setError(de.status.apiUnreachable))
      .finally(() => setMoreLoading(false));
  }

  const placeName = useMemo(() => new Map(data?.matrix.places.map((p) => [p.id, p.name]) ?? []), [data]);
  const placeLevels = useMemo(
    () => new Map((data?.matrix.places ?? []).flatMap((p) => (p.attractiveness ? [[p.id, p.attractiveness] as const] : []))),
    [data],
  );
  const driveMinutes = useMemo(() => new Map((data?.matrix.places ?? []).map((p) => [p.id, p.drive_minutes])), [data]);
  const aiLabel = meta.status === 'ready' ? (meta.meta.ai_labels.review_analysis ?? '') : '';
  const detailHref = (hotelId: string) => `/suche/${searchId}/unterkunft/${encodeURIComponent(hotelId)}#t=${token}`;

  if (!data) return loading ? <Spinner label={de.common.loading} /> : <Alert tone="error">{error ?? de.status.apiUnreachable}</Alert>;

  const update = (patch: Partial<FilterForm>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const selectCell = (c: MatrixCellDto | null) => setCell(c ? { place_id: c.place_id, checkin: c.checkin, checkout: c.checkout } : null);
  const listItems = [...data.items, ...more];
  const remaining = Math.max(0, data.page.total - data.page.offset - listItems.length);
  const facilityChips = meta.status === 'ready' ? meta.meta.chips.filter((c) => isFacilityChip(c.code)) : [];
  const sorts: Sort[] = data.matrix.places.some((p) => p.drive_minutes !== null) ? ['price', 'best', 'quality', 'drive'] : ['price', 'best', 'quality'];

  return (
    <section className="space-y-10" data-testid="results">
      <PriceFreshness fetchedAt={data.meta.prices_fetched_at} request={data.request} places={data.matrix.places} />
      <FinaleView
        searchId={searchId}
        token={token}
        filters={filterParams}
        detailHref={detailHref}
        goal={goal}
        onGoalChange={setGoal}
        placeLevels={placeLevels}
        // Not a hash link: the hash carries the search token.
        onShowUnrated={data.unrated.length > 0 ? () => document.getElementById(UNRATED_SECTION_ID)?.scrollIntoView({ behavior: 'smooth' }) : undefined}
      />

      <section className="space-y-6" data-testid="all-offers">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <Heading level={2}>{t.allOffers}</Heading>
            <Text className="text-sm">{t.allOffersLead}</Text>
            <Text className="text-sm" data-testid="results-counts">
              {t.counts(data.counts.listed, data.counts.hidden)}
              {data.counts.unrated_hidden > 0 ? ` ${t.countsUnrated(data.counts.unrated_hidden)}` : ''}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sort" className="sr-only">
              {t.sortLabel}
            </Label>
            <div role="radiogroup" aria-label={t.sortLabel} className="inline-flex rounded-lg bg-white p-1 shadow-sm ring-1 ring-zinc-200" data-testid="sort">
              {sorts.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={sort === key}
                  onClick={() => setSort(key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${sort === key ? 'bg-brand-600 text-brand-contrast' : 'text-zinc-700 hover:bg-zinc-50'}`}
                >
                  {t.sort[key]}
                </button>
              ))}
            </div>
            <Link to="/ranking" className="text-sm font-medium text-brand-700 hover:underline">
              {t.rankingLink}
            </Link>
          </div>
        </div>

        {form ? (
          <Card className="space-y-4" data-testid="result-filters">
            <Heading level={3}>{t.filters}</Heading>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="f-budget">{t.budget}</Label>
                <Input id="f-budget" inputMode="numeric" className="mt-1" value={form.budget} onChange={(e) => update({ budget: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="f-board">{t.board}</Label>
                <Select id="f-board" className="mt-1" value={form.board} onChange={(e) => update({ board: e.target.value })}>
                  {Object.entries(t.boards).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Checkbox label={t.refundable} checked={form.refundable} onChange={(e) => update({ refundable: e.target.checked })} />
              </div>
            </div>
            <div className="space-y-2" data-testid="filter-kinds">
              <p className="text-sm/6 font-medium text-zinc-950">{t.kinds}</p>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_KINDS.map((kind) => (
                  <Chip key={kind} selected={form.kinds.includes(kind)} onToggle={() => update({ kinds: toggled(form.kinds, kind) })}>
                    {t.kindNames[kind]}
                  </Chip>
                ))}
              </div>
            </div>
            {facilityChips.length > 0 ? (
              <div className="space-y-2" data-testid="filter-facilities">
                <p className="text-sm/6 font-medium text-zinc-950">{t.facilities}</p>
                <div className="flex flex-wrap gap-2">
                  {facilityChips.map((chip) => (
                    <Chip key={chip.code} selected={form.chips.includes(chip.code)} onToggle={() => update({ chips: toggled(form.chips, chip.code) })}>
                      {chip.label}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}
            <details data-testid="more-filters" open={Boolean(form.minStars || form.minRating || form.minReviews)}>
              <summary className="cursor-pointer text-sm font-medium text-brand-700">{t.moreFilters}</summary>
              <p className="mt-1 text-xs text-zinc-500">{t.moreFiltersHint}</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="f-stars">{t.minStars}</Label>
                  <Select id="f-stars" className="mt-1" value={form.minStars} onChange={(e) => update({ minStars: e.target.value })}>
                    <option value="">{de.wizard.frame.any}</option>
                    {[2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{`${n}+`}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="f-rating">{t.minRating}</Label>
                  <Select id="f-rating" className="mt-1" value={form.minRating} onChange={(e) => update({ minRating: e.target.value })}>
                    <option value="">{de.wizard.frame.any}</option>
                    {[7, 7.5, 8, 8.5, 9].map((n) => (
                      <option key={n} value={n}>{`${n.toLocaleString('de-DE')}+`}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="f-reviews">{t.minReviews}</Label>
                  <Select id="f-reviews" className="mt-1" value={form.minReviews} onChange={(e) => update({ minReviews: e.target.value })}>
                    <option value="">{de.wizard.frame.any}</option>
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </details>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setApplied(form)} data-testid="apply-filters">
                {t.apply}
              </Button>
              {searchDefaults ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setForm(searchDefaults);
                    setApplied(searchDefaults);
                  }}
                >
                  {t.reset}
                </Button>
              ) : null}
            </div>
          </Card>
        ) : null}

        <PriceMatrix places={data.matrix.places} dates={data.matrix.dates} cells={data.matrix.cells} selected={cell} onSelect={selectCell} />

        {cell ? (
          <div className="flex flex-wrap items-center gap-3" data-testid="cell-filter">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800">
              {t.cellFilter(placeName.get(cell.place_id) ?? '', cell.checkout ? formatStay(cell.checkin, cell.checkout) : formatDay(cell.checkin))}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setCell(null)}>
              {t.clearCell}
            </Button>
          </div>
        ) : null}

        {data.nights_summary ? (
          <Alert tone="info">
            <span data-testid="nights-summary">
              <strong>{t.nightsSummaryTitle(data.nights_summary.from_nights, data.nights_summary.to_nights)}</strong>{' '}
              {t.nightsSummary(
                data.nights_summary.houses,
                data.nights_summary.cheap,
                data.nights_summary.expensive,
                formatEuro(data.nights_summary.median_extra_eur),
                formatEuro(data.nights_summary.median_nightly_eur),
                data.nights_summary.to_nights,
              )}
            </span>
          </Alert>
        ) : null}

        <div className="max-w-xs">
          <Label htmlFor="name-search" className="sr-only">
            {t.nameSearch}
          </Label>
          <Input
            id="name-search"
            type="search"
            placeholder={t.nameSearch}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={80}
            data-testid="name-search"
          />
        </div>

        {loading ? <Spinner label={de.common.loading} /> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        {listItems.length === 0 ? (
          <Alert tone="info">{name ? t.nameEmpty : t.empty}</Alert>
        ) : (
          <ResultList items={listItems} detailHref={detailHref} aiLabel={aiLabel} places={placeLevels} driveMinutes={driveMinutes} />
        )}
        {remaining > 0 ? (
          <Button variant="secondary" disabled={moreLoading} onClick={() => loadMore(data.page.offset + listItems.length)} data-testid="show-more">
            {moreLoading ? de.common.loading : t.showMore(remaining)}
          </Button>
        ) : null}

        {data.oversized.length > 0 ? (
          <section className="space-y-3 border-t border-zinc-200 pt-6" data-testid="oversized-section">
            <Heading level={3}>{t.oversizedTitle(data.oversized.length)}</Heading>
            <Text className="max-w-3xl text-sm">{t.oversizedLead}</Text>
            <ResultList items={data.oversized} detailHref={detailHref} aiLabel={aiLabel} testId="oversized-list" places={placeLevels} />
          </section>
        ) : null}

        {data.unrated.length > 0 ? (
          <section id={UNRATED_SECTION_ID} className="space-y-3 border-t border-zinc-200 pt-6" data-testid="unrated-section">
            <Heading level={3}>{t.unratedTitle(data.unrated.length)}</Heading>
            <Text className="max-w-3xl text-sm">{t.unratedLead}</Text>
            <ResultList items={data.unrated} detailHref={detailHref} aiLabel={aiLabel} testId="unrated-list" places={placeLevels} />
          </section>
        ) : null}
      </section>
    </section>
  );
}
