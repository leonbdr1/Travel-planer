// Rough orientation map (Aufgabe 13): Germany, Austria, Switzerland and South
// Tyrol as simplified outlines, a few big cities, the start location and the
// regions as markers. Deliberately coarse – it only answers "where is that?".
// Drawn as inline SVG (no map library, no tiles, no external requests).

/** [lng, lat] outlines, simplified by hand to a few dozen points each. */
const COUNTRIES: Array<{ code: 'DE' | 'AT' | 'CH' | 'BZ'; points: Array<[number, number]> }> = [
  {
    code: 'DE',
    points: [
      [6.02, 50.75], [6.1, 51.8], [7.05, 52.23], [7.0, 52.47], [7.2, 53.25], [7.0, 53.6], [8.0, 53.7], [8.6, 53.9], [8.9, 54.0],
      [8.6, 54.5], [8.6, 54.9], [9.4, 54.83], [10.0, 54.5], [11.0, 54.4], [10.9, 53.95], [11.5, 54.05], [12.1, 54.18], [12.9, 54.45],
      [13.4, 54.68], [14.2, 53.93], [14.4, 53.3], [14.13, 52.83], [14.6, 52.3], [14.7, 51.55], [15.03, 51.1], [14.3, 50.88],
      [12.9, 50.4], [12.1, 50.3], [12.5, 49.75], [13.8, 48.77], [13.45, 48.57], [13.0, 47.47], [12.2, 47.7], [11.4, 47.45],
      [10.9, 47.48], [10.2, 47.28], [9.6, 47.55], [8.6, 47.65], [7.6, 47.58], [7.55, 48.1], [8.2, 48.97], [7.0, 49.15],
      [6.36, 49.47], [6.13, 50.13], [6.4, 50.3],
    ],
  },
  {
    code: 'AT',
    points: [
      [9.6, 47.55], [9.53, 47.27], [9.6, 47.05], [9.87, 46.9], [10.1, 46.84], [10.47, 46.87], [10.9, 46.77], [11.5, 47.0], [12.2, 47.08],
      [12.47, 46.7], [12.7, 46.65], [13.7, 46.52], [14.6, 46.43], [15.6, 46.68], [16.0, 46.85], [16.5, 47.0], [16.45, 47.7],
      [17.07, 48.0], [16.9, 48.6], [16.0, 48.75], [15.0, 49.0], [14.7, 48.6], [13.8, 48.77], [13.45, 48.57], [13.0, 47.47],
      [12.2, 47.7], [11.4, 47.45], [10.9, 47.48], [10.2, 47.28],
    ],
  },
  {
    code: 'CH',
    points: [
      [6.0, 46.15], [6.95, 45.93], [7.85, 45.92], [8.4, 46.25], [8.9, 45.85], [9.05, 46.05], [9.3, 46.5], [10.1, 46.23], [10.45, 46.55],
      [10.47, 46.87], [10.1, 46.84], [9.87, 46.9], [9.6, 47.05], [9.53, 47.27], [9.6, 47.55], [8.6, 47.65], [7.6, 47.58], [7.0, 47.5],
      [6.1, 46.9],
    ],
  },
  {
    code: 'BZ',
    points: [
      [10.47, 46.87], [10.9, 46.77], [11.5, 47.0], [12.2, 47.08], [12.47, 46.7], [12.0, 46.55], [11.6, 46.35], [11.2, 46.25], [10.6, 46.45],
      [10.45, 46.55],
    ],
  },
];

const CITIES: Array<{ name: string; lng: number; lat: number; left?: boolean }> = [
  { name: 'Berlin', lng: 13.4, lat: 52.52 },
  { name: 'Hamburg', lng: 10.0, lat: 53.55 },
  { name: 'Köln', lng: 6.96, lat: 50.94 },
  { name: 'Frankfurt', lng: 8.68, lat: 50.11 },
  { name: 'München', lng: 11.58, lat: 48.14 },
  { name: 'Wien', lng: 16.37, lat: 48.21, left: true },
  { name: 'Zürich', lng: 8.54, lat: 47.37 },
];

// Equirectangular projection around 48.5° N: good enough at this scale.
const LNG0 = 5.6;
const LAT0 = 55.2;
const COS = Math.cos((48.5 * Math.PI) / 180);
const SCALE = 60;
const WIDTH = Math.round((17.3 - LNG0) * COS * SCALE);
const HEIGHT = Math.round((LAT0 - 45.7) * SCALE);

const x = (lng: number) => (lng - LNG0) * COS * SCALE;
const y = (lat: number) => (LAT0 - lat) * SCALE;
const path = (points: Array<[number, number]>) => `M${points.map(([lng, lat]) => `${x(lng).toFixed(1)},${y(lat).toFixed(1)}`).join('L')}Z`;

export interface MapMarker {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export function OverviewMap({
  markers,
  highlight,
  origin,
  showCities = true,
  showLabels = true,
  className,
  title,
  size = 'full',
}: {
  markers: readonly MapMarker[];
  /** Marker drawn strongest (hovered or selected region). */
  highlight?: readonly string[];
  origin?: { label: string; lat: number; lng: number } | null;
  showCities?: boolean;
  showLabels?: boolean;
  className?: string;
  title: string;
  /** mini: a thumbnail of a few dozen pixels, the marker drawn large enough to see. */
  size?: 'full' | 'mini';
}) {
  const strong = new Set(highlight ?? []);
  // The map is drawn in about 465 × 570 units and shown at 250 px or less: sizes in map units.
  const r = size === 'mini' ? { dot: 38, strong: 44, halo: 80, stroke: 8 } : { dot: 9, strong: 12, halo: 26, stroke: 3 };
  const font = { city: 20, label: 24 };
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={title} className={className} data-testid="overview-map">
      <title>{title}</title>
      {COUNTRIES.map((c) => (
        <path
          key={c.code}
          d={path(c.points)}
          className={c.code === 'DE' ? 'fill-zinc-100 stroke-zinc-400' : 'fill-zinc-50 stroke-zinc-300'}
          strokeWidth={size === 'mini' ? 6 : 2}
          strokeLinejoin="round"
        />
      ))}
      {showCities
        ? CITIES.map((c) => (
            <g key={c.name} className="fill-zinc-400">
              <circle cx={x(c.lng)} cy={y(c.lat)} r={5} />
              <text x={x(c.lng) + (c.left ? -9 : 9)} y={y(c.lat) + 7} textAnchor={c.left ? 'end' : 'start'} className="fill-zinc-500" fontSize={font.city}>
                {c.name}
              </text>
            </g>
          ))
        : null}
      {origin ? (
        <g data-testid="map-origin">
          <rect x={x(origin.lng) - 8} y={y(origin.lat) - 8} width={16} height={16} className="fill-zinc-800" />
          {showLabels ? (
            <text x={x(origin.lng) + 13} y={y(origin.lat) + 8} className="fill-zinc-800 font-semibold" fontSize={font.label} paintOrder="stroke" stroke="white" strokeWidth={5}>
              {origin.label}
            </text>
          ) : null}
        </g>
      ) : null}
      {markers.map((m) => {
        const on = strong.size === 0 || strong.has(m.id);
        return (
          <g key={m.id} data-testid="map-marker" data-id={m.id} data-strong={strong.has(m.id) || undefined}>
            {strong.has(m.id) ? <circle cx={x(m.lng)} cy={y(m.lat)} r={r.halo} className="fill-brand-600/25" /> : null}
            <circle
              cx={x(m.lng)}
              cy={y(m.lat)}
              r={strong.has(m.id) ? r.strong : r.dot}
              className={on ? 'fill-brand-600 stroke-white' : 'fill-brand-300 stroke-white'}
              strokeWidth={r.stroke}
            />
            {showLabels && (strong.size === 0 || strong.has(m.id)) ? (
              <text x={x(m.lng) + 18} y={y(m.lat) + 8} className="fill-brand-900 font-semibold" fontSize={font.label} paintOrder="stroke" stroke="white" strokeWidth={5}>
                {m.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
