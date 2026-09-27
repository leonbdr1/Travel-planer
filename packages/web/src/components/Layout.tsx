import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import { productConfig } from '@reiseplaner/config';
import { cx } from '@reiseplaner/ui';
import { de } from '../i18n/de';
import { useMeta } from '../lib/meta';
import { Footer } from './Footer';

function DevBanner() {
  const meta = useMeta();
  if (meta.status !== 'ready' || meta.meta.providers_mode !== 'fake') return null;
  return (
    <div data-testid="dev-banner" className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
      {de.devBanner.fake}
    </div>
  );
}

export function Layout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      'rounded-lg px-3 py-2 text-sm font-medium',
      isActive ? 'bg-brand-50 text-brand-800' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
    );
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      <DevBanner />
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2" aria-label={productConfig.name}>
            <img src={productConfig.brand.logo} alt="" className="size-8" />
            <span className="text-lg font-bold tracking-tight text-zinc-950">{productConfig.name}</span>
            {productConfig.name_is_working_title ? (
              <span className="hidden rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:inline">
                {de.common.workingTitle}
              </span>
            ) : null}
          </Link>
          <nav className="flex items-center gap-1" aria-label="Hauptnavigation">
            <NavLink to="/suche" className={navClass}>
              {de.nav.search}
            </NavLink>
            <NavLink to="/so-funktionierts" className={navClass}>
              {de.nav.howItWorks}
            </NavLink>
            <NavLink to="/buchung" className={navClass}>
              {de.nav.booking}
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
