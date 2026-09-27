import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { Placeholder } from './pages/Placeholder';
import { Search } from './pages/Search';
import { SearchRun } from './pages/SearchRun';
import { HotelDetail } from './pages/HotelDetail';
import { Ranking } from './pages/Ranking';
import { BookingForm } from './pages/BookingForm';
import { BookingPayment } from './pages/BookingPayment';
import { BookingReturn } from './pages/BookingReturn';
import { BookingView } from './pages/BookingView';
import { MyBooking } from './pages/MyBooking';
import { de } from './i18n/de';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'suche', element: <Search /> },
      { path: 'suche/:id', element: <SearchRun /> },
      { path: 'suche/:id/unterkunft/:hotelId', element: <HotelDetail /> },
      { path: 'buchen/:searchId/:hotelId/:offerId', element: <BookingForm /> },
      { path: 'buchung', element: <MyBooking /> },
      { path: 'buchung/:ref', element: <BookingView /> },
      { path: 'buchung/:ref/zahlung', element: <BookingPayment /> },
      { path: 'buchung/:ref/abschluss', element: <BookingReturn /> },
      { path: 'so-funktionierts', element: <Placeholder title={de.footer.howItWorks} /> },
      { path: 'ranking', element: <Ranking /> },
      { path: 'impressum', element: <Placeholder title={de.footer.imprint} /> },
      { path: 'agb', element: <Placeholder title={de.footer.terms} /> },
      { path: 'datenschutz', element: <Placeholder title={de.footer.privacy} /> },
      { path: 'kontakt', element: <Placeholder title={de.footer.contact} /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
