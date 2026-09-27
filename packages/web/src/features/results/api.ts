import { hotelDetailResponseSchema, referencePriceResponseSchema, searchResultsResponseSchema } from '@reiseplaner/contracts';
import { apiRequest } from '../../api/client';

export type ResultsParams = Record<string, string>;

export function fetchResults(id: string, token: string, params: ResultsParams, signal?: AbortSignal) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/searches/${encodeURIComponent(id)}/results${query ? `?${query}` : ''}`, searchResultsResponseSchema, {
    headers: { 'X-Search-Token': token },
    ...(signal ? { signal } : {}),
  });
}

export function fetchHotelDetail(id: string, token: string, hotelId: string, signal?: AbortSignal) {
  return apiRequest(`/searches/${encodeURIComponent(id)}/hotels/${encodeURIComponent(hotelId)}`, hotelDetailResponseSchema, {
    headers: { 'X-Search-Token': token },
    ...(signal ? { signal } : {}),
  });
}

export function fetchReferencePrice(id: string, token: string, hotelId: string, offerId: string, signal?: AbortSignal) {
  return apiRequest(
    `/searches/${encodeURIComponent(id)}/hotels/${encodeURIComponent(hotelId)}/reference-price?offer_id=${encodeURIComponent(offerId)}`,
    referencePriceResponseSchema,
    { headers: { 'X-Search-Token': token }, ...(signal ? { signal } : {}) },
  );
}
