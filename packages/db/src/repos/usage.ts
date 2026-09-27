// Provider usage counters (architektur.md 5.7): the basis for the
// look-to-book watchdog and the cost report.
import type { Queryable } from '../db';

export interface UsageIncrement {
  provider: string;
  endpoint: string;
  calls: number;
}

export async function incrementProviderUsage(db: Queryable, day: string, increments: UsageIncrement[]): Promise<void> {
  for (const inc of increments) {
    if (inc.calls <= 0) continue;
    await db.query(
      `INSERT INTO app.provider_usage (day, provider, endpoint, calls) VALUES ($1, $2, $3, $4)
       ON CONFLICT (day, provider, endpoint) DO UPDATE SET calls = app.provider_usage.calls + EXCLUDED.calls`,
      [day, inc.provider, inc.endpoint, inc.calls],
    );
  }
}

export interface UsageRow {
  day: string;
  provider: string;
  endpoint: string;
  calls: number;
}

export async function usageSince(db: Queryable, fromDay: string): Promise<UsageRow[]> {
  const rows = await db.query<{ day: string; provider: string; endpoint: string; calls: number }>(
    `SELECT day::text AS day, provider, endpoint, calls FROM app.provider_usage WHERE day >= $1 ORDER BY day, provider, endpoint`,
    [fromDay],
  );
  return rows.map((r) => ({ ...r, calls: Number(r.calls) }));
}

/** Collects per-endpoint call counts in memory and flushes them in one go. */
export class UsageRecorder {
  private readonly counts = new Map<string, number>();

  record(provider: string, endpoint: string): void {
    const key = `${provider}\u0000${endpoint}`;
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  total(provider?: string): number {
    let sum = 0;
    for (const [key, n] of this.counts) if (!provider || key.startsWith(`${provider}\u0000`)) sum += n;
    return sum;
  }

  async flush(db: Queryable, day: string): Promise<void> {
    const increments = [...this.counts].map(([key, calls]) => {
      const [provider = '', endpoint = ''] = key.split('\u0000');
      return { provider, endpoint, calls };
    });
    this.counts.clear();
    await incrementProviderUsage(db, day, increments);
  }
}
