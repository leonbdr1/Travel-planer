// Provider-neutral domain types. Adapters in packages/providers map vendor
// responses into these shapes; everything in packages/domain works on them.

/** ISO date `YYYY-MM-DD`. */
export type IsoDate = string;
/** ISO timestamp in UTC, e.g. `2026-10-01T22:00:00Z`. */
export type IsoTimestamp = string;

export interface Money {
  amountCents: number;
  currency: string;
}

export interface Occupancy {
  adults: number;
  childrenAges: number[];
}

export type BoardType = 'RO' | 'BB' | 'HB' | 'FB' | 'AI' | 'OTHER';

export interface TaxOrFee {
  amountCents: number;
  currency: string;
  /** true: contained in the total; false: to be paid at the property. */
  included: boolean;
  description: string | null;
}

export interface CancelPolicyStep {
  /** From this moment (UTC) the given penalty applies. */
  from: IsoTimestamp;
  penaltyCents: number;
  currency: string;
}

export interface RateOption {
  offerId: string;
  roomName: string;
  boardType: BoardType;
  boardName: string | null;
  /** Final price for the guest for the whole stay (incl. margin and prepaid taxes). */
  totalCents: number;
  currency: string;
  /** Vendor's suggested selling price, if provided (display rules, S2.2). */
  suggestedSellingCents: number | null;
  /** null when the vendor sent no tax information at all. */
  taxes: TaxOrFee[] | null;
  refundable: boolean;
  cancelPolicy: CancelPolicyStep[];
  maxOccupancy: number | null;
}

export interface HotelSummary {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  stars: number | null;
  /** Average guest rating on its native scale. */
  rating: number | null;
  ratingScale: 5 | 10;
  reviewCount: number | null;
  hotelType: string | null;
  mainPhotoUrl: string | null;
  facilityIds: number[];
}

export interface HotelRates {
  hotelId: string;
  options: RateOption[];
}

export interface HotelDetails extends HotelSummary {
  description: string | null;
  photos: string[];
  facilities: string[];
  phone: string | null;
  email: string | null;
  checkinTime: string | null;
  checkoutTime: string | null;
  importantInformation: string | null;
}

export interface GuestReview {
  /** Stable id within the provider response (index-based if absent). */
  id: string;
  /** 0–10 */
  score: number | null;
  date: IsoDate | null;
  language: string | null;
  headline: string | null;
  pros: string | null;
  cons: string | null;
  /** Author name is dropped by the adapter (architektur.md 9.3). */
}

export interface SentimentCategory {
  name: string;
  /** 0–10 */
  rating: number;
}

export interface ReviewsResult {
  reviews: GuestReview[];
  sentiment: { categories: SentimentCategory[] } | null;
}
