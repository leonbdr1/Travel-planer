// Runtime meta (environment, provider mode) loaded once per page view.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { metaConfigResponseSchema, type MetaConfigResponse } from '@reiseplaner/contracts';
import { apiRequest } from '../api/client';

type MetaState = { status: 'loading' } | { status: 'ready'; meta: MetaConfigResponse } | { status: 'error' };

const MetaContext = createContext<MetaState>({ status: 'loading' });

export function MetaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MetaState>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/meta/config', metaConfigResponseSchema, { signal: controller.signal })
      .then((meta) => setState({ status: 'ready', meta }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });
    return () => controller.abort();
  }, []);
  return <MetaContext.Provider value={state}>{children}</MetaContext.Provider>;
}

export function useMeta(): MetaState {
  return useContext(MetaContext);
}

/** Local test operation with real data: at least one real provider in the dev environment (HANDOFF drift 27). */
export function isTestbetrieb(meta: MetaConfigResponse): boolean {
  return meta.app_env === 'dev' && Object.values(meta.provider_sources).some((source) => source === 'real');
}
