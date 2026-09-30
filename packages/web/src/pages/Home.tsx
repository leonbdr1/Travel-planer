import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ClockIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { productConfig } from '@reiseplaner/config';
import { buttonClasses, Heading, Text } from '@reiseplaner/ui';
import { StatusLine } from '../components/StatusLine';
import { SearchBar } from '../features/search/SearchBar';
import { forgetSearch, loadRecent, type RecentSearch } from '../features/search/recent';
import { loadState, saveState, type WizardState } from '../features/search/state';
import { de } from '../i18n/de';
import { useMeta } from '../lib/meta';

/** Search bar of the hero: filled in here, continued on /suche with the same state. */
function HeroSearch() {
  const meta = useMeta();
  const navigate = useNavigate();
  const [state, setState] = useState<WizardState>(() => ({ ...loadState(), step: 1 }));
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    saveState(state);
  }, [state]);
  if (meta.status !== 'ready') {
    return (
      <Link to="/suche" className={buttonClasses('primary', 'lg')}>
        {de.home.cta}
      </Link>
    );
  }
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (state.origin === null) return;
        saveState(state);
        navigate('/suche');
      }}
    >
      <SearchBar
        state={state}
        update={(patch) => setState((s) => ({ ...s, ...patch }))}
        meta={meta.meta}
        touched={touched}
        action={
          <button type="submit" className={buttonClasses('primary', 'lg', 'h-12 lg:h-auto')} data-testid="hero-search">
            <MagnifyingGlassIcon aria-hidden="true" className="size-5" />
            {de.home.search}
          </button>
        }
      />
    </form>
  );
}

/** Links to the last searches of this browser (B3), newest first. */
function RecentSearches() {
  const [entries, setEntries] = useState<RecentSearch[]>(() => loadRecent(new Date(), productConfig.compliance.retention.searches_days));
  if (entries.length === 0) return null;
  return (
    <section className="space-y-2" data-testid="recent-searches">
      <h2 className="text-sm font-semibold text-zinc-900">{de.home.recentTitle}</h2>
      <ul className="flex flex-wrap gap-2">
        {entries.map((e) => (
          <li key={e.id} className="inline-flex items-center rounded-full bg-white text-sm ring-1 ring-zinc-200">
            <Link to={`/suche/${e.id}#t=${e.token}`} className="inline-flex items-center gap-1.5 py-1.5 pr-1 pl-3 text-zinc-800 hover:text-brand-700" data-testid="recent-search">
              <ClockIcon aria-hidden="true" className="size-4 text-zinc-400" />
              {e.label}
            </Link>
            <button
              type="button"
              aria-label={de.home.recentRemove(e.label)}
              className="mr-1 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              onClick={() => {
                forgetSearch(e.id);
                setEntries((list) => list.filter((x) => x.id !== e.id));
              }}
            >
              <XMarkIcon aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Home() {
  const t = de.home;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <section className="space-y-6">
        <div className="max-w-3xl space-y-6">
          <Heading level={1}>{t.heroTitle}</Heading>
          <Text className="text-lg">{t.heroLead}</Text>
        </div>
        <HeroSearch />
        <RecentSearches />
        <StatusLine />
      </section>
    </div>
  );
}
