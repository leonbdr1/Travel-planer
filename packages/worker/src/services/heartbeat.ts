// Heartbeats to the ops worker (architektur.md 6.12, 13): every cron job and
// finished search reports that it ran. Best effort: without configuration
// (local) nothing is sent, and a failing heartbeat never fails the job.
/** Heartbeat of the search workflow; sent only when a search finished successfully. */
export const SEARCH_WORKFLOW_HEARTBEAT_JOB = 'search-workflow';

export interface HeartbeatConfig {
  url?: string | undefined;
  token?: string | undefined;
  fetch?: typeof fetch;
}

export async function sendHeartbeat(config: HeartbeatConfig, job: string, detail: Record<string, number | string> = {}): Promise<boolean> {
  if (!config.url || !config.token) return false;
  try {
    const res = await (config.fetch ?? fetch)(`${config.url.replace(/\/$/, '')}/heartbeat/${encodeURIComponent(job)}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(detail),
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    console.error(JSON.stringify({ level: 'warn', msg: 'heartbeat failed', job }));
    return false;
  }
}
