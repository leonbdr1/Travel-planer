// Routes. Home and the search wizard are in the main bundle; every other page
// loads on first visit (P1), so the first page comes up with less code. Errors
// of a page show RouteError inside the layout (B6).
import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { Spinner } from '@reiseplaner/ui';
import { Layout } from './components/Layout';
import { RouteError } from './components/RouteError';
import { de } from './i18n/de';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { Search } from './pages/Search';

/** A page loaded on demand: `load` imports its module, `pick` names the component. */
function page<M>(path: string, load: () => Promise<M>, pick: (m: M) => ComponentType): RouteObject {
  return { path, lazy: async () => ({ Component: pick(await load()) }) };
}

function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Spinner label={de.common.loading} />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    HydrateFallback: Loading,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Home /> },
          { path: 'suche', element: <Search /> },
          page('suche/:id', () => import('./pages/SearchRun'), (m) => m.SearchRun),
          page('suche/:id/unterkunft/:hotelId', () => import('./pages/HotelDetail'), (m) => m.HotelDetail),
          page('buchen/:searchId/:hotelId/:offerId', () => import('./pages/BookingForm'), (m) => m.BookingForm),
          page('buchung', () => import('./pages/MyBooking'), (m) => m.MyBooking),
          page('buchung/:ref', () => import('./pages/BookingView'), (m) => m.BookingView),
          page('buchung/:ref/zahlung', () => import('./pages/BookingPayment'), (m) => m.BookingPayment),
          page('buchung/:ref/abschluss', () => import('./pages/BookingReturn'), (m) => m.BookingReturn),
          page('so-funktionierts', () => import('./pages/Legal'), (m) => m.HowItWorks),
          page('ranking', () => import('./pages/Ranking'), (m) => m.Ranking),
          page('so-filtern-wir', () => import('./pages/FilterSystem'), (m) => m.FilterSystem),
          page('entwickler', () => import('./pages/Developer'), (m) => m.Developer),
          page('impressum', () => import('./pages/Legal'), (m) => m.Imprint),
          page('agb', () => import('./pages/Legal'), (m) => m.Terms),
          page('datenschutz', () => import('./pages/Legal'), (m) => m.Privacy),
          page('kontakt', () => import('./pages/Legal'), (m) => m.Contact),
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);
