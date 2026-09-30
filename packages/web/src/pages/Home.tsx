import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { productConfig } from '@reiseplaner/config';
import { buttonClasses, Card, Heading, Text } from '@reiseplaner/ui';
import { StatusLine } from '../components/StatusLine';
import { SearchBar } from '../features/search/SearchBar';
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

export function Home() {
  const t = de.home;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <section className="space-y-6">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{productConfig.tagline}</p>
          <Heading level={1}>{t.heroTitle}</Heading>
          <Text className="text-lg">{t.heroLead}</Text>
        </div>
        <HeroSearch />
        <StatusLine />
      </section>
      <section className="mt-16 space-y-6">
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
