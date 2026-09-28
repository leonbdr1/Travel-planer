// Bindings of the watchdog reiseplaner-ops (architektur.md 12): KV for
// heartbeats and alarm states, the app's health URL, secrets for heartbeat
// authentication and Resend. Structural types keep the code usable from
// Node as well (CLI demo).
export interface KvStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface OpsEnv {
  OPS_KV: KvStore;
  APP_HEALTH_URL: string;
  /** dev · test · staging · production */
  OPS_ENV: string;
  OPS_HB_TOKEN?: string;
  RESEND_API_KEY?: string;
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;
