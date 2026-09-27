import { Link } from 'react-router';
import { productConfig } from '@reiseplaner/config';
import { de } from '../i18n/de';

export function Footer() {
  const t = de.footer;
  const links: Array<[string, string]> = [
    ['/impressum', t.imprint],
    ['/agb', t.terms],
    ['/datenschutz', t.privacy],
    ['/kontakt', t.contact],
    ['/so-funktionierts', t.howItWorks],
    ['/ranking', t.ranking],
  ];
  return (
    <footer className="border-t border-zinc-200 bg-white" data-testid="site-footer">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 text-sm sm:grid-cols-3 sm:px-6">
        <div className="space-y-2">
          <p className="font-semibold text-zinc-900">{productConfig.name}</p>
          <p className="text-zinc-500">{t.intermediary}</p>
        </div>
        <nav aria-label={t.legal} className="space-y-2">
          <p className="font-semibold text-zinc-900">{t.legal}</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {links.map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="text-zinc-600 hover:text-brand-700 hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-2" data-testid="attribution">
          <p className="font-semibold text-zinc-900">{t.sources}</p>
          <ul className="space-y-1 text-zinc-500">
            {productConfig.attribution.map((a) => (
              <li key={a.id}>
                <a href={a.source_url} className="hover:underline" rel="noreferrer" target="_blank">
                  {a.text}
                </a>{' '}
                (
                <a href={a.license_url} className="hover:underline" rel="noreferrer" target="_blank">
                  {a.license}
                </a>
                )
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
