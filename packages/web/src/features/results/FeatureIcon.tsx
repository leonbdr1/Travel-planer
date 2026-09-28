// Small line icons for the finale badges (S11.7): meals, wellness, parking,
// kitchen and walking distances. Decorative only (aria-hidden); the badge text
// carries the meaning.
import type { ReactNode } from 'react';

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ICONS: Record<string, ReactNode> = {
  fruehstueck_inklusive: <path {...stroke} d="M4 9h12v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Zm12 1h1.5a2.5 2.5 0 0 1 0 5H16M3 21h15" />,
  halbpension: <path {...stroke} d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2 6 0 8v10" />,
  kostenlos_stornierbar: <path {...stroke} d="M4 12l5 5L20 6" />,
  sauna_wellness: <path {...stroke} d="M7 3c-2 3 2 4 0 7M12 3c-2 3 2 4 0 7M17 3c-2 3 2 4 0 7M3 14h18v6H3z" />,
  schwimmbad: <path {...stroke} d="M2 18c2.5 2 4.5 2 7 0s4.5-2 7 0 4 2 6 0M8 15V5a2 2 0 0 1 4 0M16 15V5a2 2 0 0 0-4 0M8 10h8" />,
  parkplatz: (
    <>
      <rect {...stroke} x="3" y="3" width="18" height="18" rx="3" />
      <path {...stroke} d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </>
  ),
  kueche: <path {...stroke} d="M3 11h13a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Zm13 1h5" />,
  lage_lift: <path {...stroke} d="M2 5l20-3M12 3.5V9M7 9h10v8H7zM7 13h10" />,
  lage_bus: <path {...stroke} d="M5 3h14a1 1 0 0 1 1 1v13H4V4a1 1 0 0 1 1-1ZM4 11h16M7 17v3M17 17v3M8 14h.01M16 14h.01" />,
  lage_bahn: <path {...stroke} d="M6 3h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V3Zm0 7h12M8 21l2-4M16 21l-2-4" />,
  lage_supermarkt: <path {...stroke} d="M3 4h2l2.5 11h11L21 7H6.2M9 20h.01M18 20h.01" />,
  lage_ortskern: <path {...stroke} d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  lage_gastro: <path {...stroke} d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2 6 0 8v10" />,
};

export function FeatureIcon({ code }: { code: string }) {
  const icon = ICONS[code];
  if (!icon) return null;
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 flex-none" aria-hidden="true">
      {icon}
    </svg>
  );
}
