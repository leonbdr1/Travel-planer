// S11.8 demo: the developer page through the local stack. The AI switch
// (simulated model: on unless switched off) turns the AI review check off for
// the next search and back on; the page reports the local search limits.
import { devSettingsResponseSchema } from '@reiseplaner/contracts';
import type { DemoOutput } from '../lib/output';
import { getResults, runGoalSearch } from '../lib/goal-search';
import { catalogPlaceIds } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';
import { seedDevData } from '../seed';

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const settings = async (enabled?: boolean) => {
      const res = await fetch(`${stack.baseUrl}/api/v1/dev/settings`, {
        method: enabled === undefined ? 'GET' : 'PUT',
        headers: { 'content-type': 'application/json' },
        ...(enabled === undefined ? {} : { body: JSON.stringify({ ai_enabled: enabled }) }),
      });
      return devSettingsResponseSchema.parse(await res.json());
    };
    const meta = async () => ((await (await fetch(`${stack.baseUrl}/api/v1/meta/config`)).json()) as { llm_enabled: boolean }).llm_enabled;
    const start = await settings();
    out.log(`1) Entwicklerseite: KI ${start.ai.source === 'fake' ? 'simuliert' : 'echt'}, ${start.ai.enabled ? 'an' : 'aus'}; Suchgrenzen ${start.limits.searches_per_hour}/h, ${start.limits.searches_per_day}/Tag`);
    // Different places per search: checks are cached per house, a second search would reuse them.
    const aiChecks = async (label: string, place: string) => {
      const search = await runGoalSearch(stack, await catalogPlaceIds(stack.db.db, [place]), 'ausgewogen');
      const results = await getResults(stack, search);
      const checked = results.items.filter((i) => i.review_status !== 'none');
      const verified = checked.filter((i) => i.review_status === 'ok').length;
      const warnings = checked.flatMap((i) => i.warnings);
      out.log(
        `   ${label} (${place}): ${checked.length} Unterkünfte geprüft, ${verified} mit Ergebnis „geprüft“, ${checked.length - verified} „ungeprüft“ (nur Stichworte); Warnhinweise ${warnings.filter((w) => w.verified).length} KI-bestätigt, ${warnings.filter((w) => !w.verified).length} unbestätigt`,
      );
      return { checked: checked.length, unverified: checked.length - verified };
    };
    const on = await aiChecks('Suche mit KI an', 'Füssen');
    const off = await settings(false);
    out.log(`2) Schalter aus → KI ${off.ai.enabled ? 'an' : 'aus'}, /meta/config llm_enabled=${await meta()}`);
    const without = await aiChecks('Suche mit KI aus', 'Oberstdorf');
    const back = await settings(true);
    out.log(`3) Schalter an → KI ${back.ai.enabled ? 'an' : 'aus'}, /meta/config llm_enabled=${await meta()}`);
    const ok = start.ai.enabled && on.checked > 0 && on.unverified === 0 && !off.ai.enabled && without.unverified > 0 && back.ai.enabled && start.limits.searches_per_hour === 60;
    out.log(ok ? '→ Ausgeschaltet prüft der Rezensionscheck nur per Stichwort (keine KI-Kosten), eingeschaltet wieder mit KI' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
