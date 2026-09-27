// zod schemas for LiteAPI v3.0 responses.
//
// ⟂ Contract status: written from the LiteAPI v3 reference as known on
// 2026-09-27 WITHOUT access to docs.liteapi.travel (egress blocked in the
// build session). Field names the adapter relies on are validated strictly;
// uncertain fields are optional. S2.2 contract check against the live docs
// and recorded sandbox fixtures (O2.2) is still open (see HANDOFF.md).
import { z } from 'zod';

const amount = z.object({ amount: z.number(), currency: z.string() });
const amountWithSource = amount.extend({ source: z.string().nullish() });

export const rawTaxSchema = z.object({
  included: z.boolean(),
  description: z.string().nullish(),
  amount: z.number(),
  currency: z.string().nullish(),
});

export const rawCancelInfoSchema = z.object({
  cancelTime: z.string(),
  amount: z.number(),
  currency: z.string().nullish(),
  type: z.string().nullish(),
  timezone: z.string().nullish(),
});

export const rawRateSchema = z.object({
  rateId: z.string().nullish(),
  occupancyNumber: z.number().nullish(),
  name: z.string(),
  maxOccupancy: z.number().nullish(),
  boardType: z.string().nullish(),
  boardName: z.string().nullish(),
  retailRate: z.object({
    total: z.array(amount).min(1),
    suggestedSellingPrice: z.array(amountWithSource).nullish(),
    taxesAndFees: z.array(rawTaxSchema).nullish(),
  }),
  cancellationPolicies: z
    .object({
      cancelPolicyInfos: z.array(rawCancelInfoSchema).nullish(),
      refundableTag: z.string().nullish(),
    })
    .nullish(),
});

export const rawRoomTypeSchema = z.object({
  roomTypeId: z.string().nullish(),
  offerId: z.string(),
  rates: z.array(rawRateSchema).min(1),
  offerRetailRate: amount.nullish(),
  suggestedSellingPrice: amountWithSource.nullish(),
});

export const rawHotelRatesSchema = z.object({
  hotelId: z.string(),
  roomTypes: z.array(rawRoomTypeSchema),
});

export const rawHotelInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  main_photo: z.string().nullish(),
  thumbnail: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  stars: z.number().nullish(),
  starRating: z.number().nullish(),
  rating: z.number().nullish(),
  reviewCount: z.number().nullish(),
  hotelType: z.string().nullish(),
  facilityIds: z.array(z.number()).nullish(),
});

export const ratesResponseSchema = z.object({
  data: z.array(rawHotelRatesSchema).nullish(),
  hotels: z.array(rawHotelInfoSchema).nullish(),
});
export type RawRatesResponse = z.infer<typeof ratesResponseSchema>;

export const hotelDetailsResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    name: z.string(),
    hotelDescription: z.string().nullish(),
    hotelImportantInformation: z.string().nullish(),
    main_photo: z.string().nullish(),
    hotelImages: z.array(z.object({ url: z.string(), urlHd: z.string().nullish(), defaultImage: z.boolean().nullish() })).nullish(),
    address: z.string().nullish(),
    city: z.string().nullish(),
    country: z.string().nullish(),
    location: z.object({ latitude: z.number(), longitude: z.number() }).nullish(),
    starRating: z.number().nullish(),
    rating: z.number().nullish(),
    reviewCount: z.number().nullish(),
    hotelType: z.string().nullish(),
    hotelFacilities: z.array(z.string()).nullish(),
    facilityIds: z.array(z.number()).nullish(),
    phone: z.string().nullish(),
    email: z.string().nullish(),
    checkinCheckoutTimes: z.object({ checkin: z.string().nullish(), checkout: z.string().nullish() }).nullish(),
  }),
});

export const reviewsResponseSchema = z.object({
  data: z
    .array(
      z.object({
        averageScore: z.number().nullish(),
        country: z.string().nullish(),
        type: z.string().nullish(),
        name: z.string().nullish(),
        date: z.string().nullish(),
        headline: z.string().nullish(),
        language: z.string().nullish(),
        pros: z.string().nullish(),
        cons: z.string().nullish(),
      }),
    )
    .nullish(),
  sentimentAnalysis: z
    .object({
      categories: z.array(z.object({ name: z.string(), rating: z.number() })).nullish(),
    })
    .nullish(),
});

export const facilitiesResponseSchema = z.object({
  data: z.array(z.object({ facility_id: z.number(), facility: z.string() })),
});

export const prebookResponseSchema = z.object({
  data: z.object({
    prebookId: z.string(),
    offerId: z.string().nullish(),
    hotelId: z.string(),
    currency: z.string(),
    price: z.number(),
    priceDifferencePercent: z.number().nullish(),
    cancellationChanged: z.boolean().nullish(),
    boardChanged: z.boolean().nullish(),
    transactionId: z.string().nullish(),
    secretKey: z.string().nullish(),
    roomTypes: z.array(rawRoomTypeSchema.partial({ offerId: true })).nullish(),
  }),
});

export const bookResponseSchema = z.object({
  data: z.object({
    bookingId: z.string(),
    status: z.string(),
    hotelConfirmationCode: z.string().nullish(),
    checkin: z.string().nullish(),
    checkout: z.string().nullish(),
    price: z.number().nullish(),
    currency: z.string().nullish(),
    hotel: z.object({ hotelId: z.string().nullish(), name: z.string().nullish() }).nullish(),
    cancellationPolicies: z
      .object({ cancelPolicyInfos: z.array(rawCancelInfoSchema).nullish(), refundableTag: z.string().nullish() })
      .nullish(),
  }),
});

export const bookingStatusResponseSchema = z.object({
  data: z.object({
    bookingId: z.string(),
    status: z.string(),
    hotelConfirmationCode: z.string().nullish(),
    cancellation_fee: z.number().nullish(),
    refund_amount: z.number().nullish(),
    currency: z.string().nullish(),
  }),
});
