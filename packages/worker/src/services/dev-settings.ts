// Developer page settings (S11.8): switches Ben flips while testing locally,
// stored in app.meta_kv. Only in dev and test; staging and production follow
// their configuration alone.
import { deleteSetting, getSetting, setSetting, type Queryable } from '@reiseplaner/db';
import { z } from 'zod';
import { configuredSources, type RuntimeConfig } from '../env';

export const AI_SWITCH_KEY = 'dev.ai_enabled';

export function devSettingsAllowed(config: RuntimeConfig): boolean {
  return config.APP_ENV === 'dev' || config.APP_ENV === 'test';
}

/** Testers with the user password (site gate) see the site as an end customer: no developer tools. */
export function endUserView(role: string | undefined): boolean {
  return role === 'user';
}

export interface AiSwitchState {
  /** The AI may run at all (LLM_ENABLED). */
  available: boolean;
  /** Real model with real costs, or the simulated one. */
  source: 'fake' | 'real';
  /** The switch as set on the developer page; null = never set. */
  switched: boolean | null;
  /** What the review check and the wish parser use now. */
  enabled: boolean;
}

/**
 * The real model costs money: without an explicit switch it stays off in dev.
 * The simulated one is free and on unless switched off.
 */
export async function aiSwitchState(db: Queryable, config: RuntimeConfig): Promise<AiSwitchState> {
  const source = configuredSources(config).llm;
  if (!devSettingsAllowed(config)) return { available: config.LLM_ENABLED, source, switched: null, enabled: config.LLM_ENABLED };
  const switched = await getSetting(db, AI_SWITCH_KEY, z.boolean());
  const enabled = config.LLM_ENABLED && (switched ?? source === 'fake');
  return { available: config.LLM_ENABLED, source, switched, enabled };
}

export async function effectiveLlmEnabled(db: Queryable, config: RuntimeConfig): Promise<boolean> {
  return (await aiSwitchState(db, config)).enabled;
}

export async function setAiSwitch(db: Queryable, enabled: boolean | null): Promise<void> {
  if (enabled === null) await deleteSetting(db, AI_SWITCH_KEY);
  else await setSetting(db, AI_SWITCH_KEY, enabled);
}
