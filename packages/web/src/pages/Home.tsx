import { useState } from 'react';
import { Link } from 'react-router';
import { ClockIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { productConfig } from '@reiseplaner/config';
import { buttonClasses, Card, Heading, Text } from '@reiseplaner/ui';
import { StatusLine } from '../components/StatusLine';
import { forgetSearch, loadRecent, type RecentSearch } from '../features/search/recent';
import { de } from '../i18n/de';

/** One button to the search: the frame (where, when, who) is filled in on /suche. */
function HeroSearch() {
  return (
    <Link to="/suche" className={buttonClasses('primary', 'lg')} data-testid="hero-search">
      <MagnifyingGlassIcon aria-hidden="true" className="size-5" />
      {de.home.cta}
    </Link>
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
      <section className="mt-14 space-y-6" data-testid="home-steps">
        <Heading level={2}>{t.stepsTitle}</Heading>
        <ol className="grid gap-4 sm:grid-cols-3">
          {t.steps.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full space-y-2">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                  {index + 1}
                </span>
                <Heading level={3}>{step.title}</Heading>
                <Text className="text-sm">{step.text}</Text>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
