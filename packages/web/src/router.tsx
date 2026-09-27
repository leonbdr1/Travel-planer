import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { Placeholder } from './pages/Placeholder';
import { Search } from './pages/Search';
import { SearchRun } from './pages/SearchRun';
import { de } from './i18n/de';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'suche', element: <Search /> },
      { path: 'suche/:id', element: <SearchRun /> },
      { path: 'buchung', element: <Placeholder title={de.nav.booking} /> },
      { path: 'so-funktionierts', element: <Placeholder title={de.footer.howItWorks} /> },
      { path: 'ranking', element: <Placeholder title={de.footer.ranking} /> },
      { path: 'impressum', element: <Placeholder title={de.footer.imprint} /> },
      { path: 'agb', element: <Placeholder title={de.footer.terms} /> },
      { path: 'datenschutz', element: <Placeholder title={de.footer.privacy} /> },
      { path: 'kontakt', element: <Placeholder title={de.footer.contact} /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
