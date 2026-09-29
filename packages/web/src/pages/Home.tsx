import { Link } from 'react-router';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { productConfig } from '@reiseplaner/config';
import { buttonClasses, Card, Heading, Text } from '@reiseplaner/ui';
import { StatusLine } from '../components/StatusLine';
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
