// openrouteservice matrix adapter (architektur.md 8.2). Host api.heigit.org;
// the exact path is still to be verified (S2.3, see HANDOFF.md).
import { z } from 'zod';
import type { LatLng } from '@reiseplaner/domain';
import { ProviderError } from '../http/errors';
import { requestJson, type FetchLike } from '../http/request';

export interface RouteMetric {
  durationMin: number;
  distanceKm: number;
}

export interface RoutingPort {
  /** Car travel from one origin to many destinations; null where unroutable. */
  matrix(origin: LatLng, destinations: LatLng[]): Promise<Array<RouteMetric | null>>;
}

const matrixSchema = z.object({
  durations: z.array(z.array(z.number().nullable())),
  distances: z.array(z.array(z.number().nullable())).optional(),
});

export interface OrsClientOptions {
  apiKey: string | undefined;
  baseUrl: string;
  fetch: FetchLike;
  timeoutMs?: number;
  onCall?: (endpoint: string) => void;
}

export function createOrsClient(options: OrsClientOptions): RoutingPort {
  return {
    async matrix(origin, destinations) {
      if (destinations.length === 0) return [];
      if (!options.apiKey) throw new ProviderError('ors', 'not_configured', 'ORS_API_KEY is not set');
      try {
        const raw = await requestJson({
          provider: 'ors',
          endpoint: 'matrix',
          url: `${options.baseUrl}/v2/matrix/driving-car`,
          schema: matrixSchema,
          fetch: options.fetch,
          headers: { Authorization: options.apiKey },
          body: {
            locations: [[origin.lng, origin.lat], ...destinations.map((d) => [d.lng, d.lat])],
            sources: [0],
            destinations: destinations.map((_, i) => i + 1),
            metrics: ['duration', 'distance'],
            units: 'km',
          },
          timeoutMs: options.timeoutMs ?? 10_000,
          // Quota errors are handled by the caller's fallback, not by retries.
          maxRetries: 0,
          ...(options.onCall ? { onAttempt: options.onCall } : {}),
        });
        const durations = raw.durations[0] ?? [];
        const distances = raw.distances?.[0] ?? [];
        return destinations.map((_, i) => {
          const seconds = durations[i];
          const km = distances[i];
          return seconds === null || seconds === undefined
            ? null
            : { durationMin: Math.round(seconds / 60), distanceKm: km === null || km === undefined ? 0 : Math.round(km * 10) / 10 };
        });
      } catch (err) {
        if (err instanceof ProviderError && err.status === 403) {
          // Quota and denied access look alike (403); the original text tells them apart.
          throw new ProviderError('ors', 'quota_exhausted', `quota exhausted or access denied (${err.message})`, 403);
        }
        throw err;
      }
    },
  };
}
