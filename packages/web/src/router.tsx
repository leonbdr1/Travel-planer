import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { Search } from './pages/Search';
import { SearchRun } from './pages/SearchRun';
import { HotelDetail } from './pages/HotelDetail';
import { Ranking } from './pages/Ranking';
import { FilterSystem } from './pages/FilterSystem';
import { BookingForm } from './pages/BookingForm';
import { BookingPayment } from './pages/BookingPayment';
import { BookingReturn } from './pages/BookingReturn';
import { BookingView } from './pages/BookingView';
import { MyBooking } from './pages/MyBooking';
import { Developer } from './pages/Developer';
import { Contact, HowItWorks, Imprint, Privacy, Terms } from './pages/Legal';

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
      { path: 'so-funktionierts', element: <HowItWorks /> },
      { path: 'ranking', element: <Ranking /> },
      { path: 'so-filtern-wir', element: <FilterSystem /> },
      { path: 'entwickler', element: <Developer /> },
      { path: 'impressum', element: <Imprint /> },
      { path: 'agb', element: <Terms /> },
      { path: 'datenschutz', element: <Privacy /> },
      { path: 'kontakt', element: <Contact /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
