// Starting a search (ALTCHA solved in the browser) and polling its progress.
import { solveChallenge, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/web/sha';
import {
  altchaChallengeSchema,
  createSearchResponseSchema,
  searchProgressResponseSchema,
  type SearchRequest,
} from '@reiseplaner/contracts';
import { apiRequest } from '../../api/client';

export async function solveAltcha(): Promise<string> {
  const challenge = (await apiRequest('/meta/altcha-challenge', altchaChallengeSchema)) as Challenge;
  const solution = await solveChallenge({ challenge, deriveKey });
  if (!solution) throw new Error('altcha_unsolved');
  return btoa(JSON.stringify({ challenge, solution }));
}

export async function startSearch(request: SearchRequest) {
  const altcha = await solveAltcha();
  return apiRequest('/searches', createSearchResponseSchema, { body: { ...request, altcha } });
}

export function fetchProgress(id: string, token: string, signal?: AbortSignal) {
  return apiRequest(`/searches/${encodeURIComponent(id)}`, searchProgressResponseSchema, {
    headers: { 'X-Search-Token': token },
    ...(signal ? { signal } : {}),
  });
}
