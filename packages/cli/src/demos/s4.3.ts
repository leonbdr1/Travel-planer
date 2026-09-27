// S4.3 demo: POST /wishes/parse over HTTP against the real local stack with
// the simulated model, then the same request with LLM_ENABLED=false through
// the Worker's Hono app in-process (fallback answer with notice).
import { createApp } from '@reiseplaner/worker/app';
import { wranglerVars } from '../lib/worker-env';
import type { DemoOutput } from '../lib/output';
import { startDemoStack } from '../lib/stack';

const TEXT = 'sauber, ruhig und Blick auf den See';

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack (Fake-LLM) …');
  const stack = await startDemoStack();
  try {
    const res = await fetch(`${stack.baseUrl}/api/v1/wishes/parse`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: TEXT }),
    });
    const body = (await res.json()) as { chips: string[]; unmatched: string[]; translated: boolean };
    out.log(`POST /wishes/parse {"text":"${TEXT}"} → HTTP ${res.status}`);
    out.log(JSON.stringify({ chips: body.chips, unmatched: body.unmatched }));
    const runs = await stack.db.db.query<{ skill: string; outcome: string; cost: number }>(
      "SELECT skill, outcome, cost_usd::float8 AS cost FROM app.skill_runs WHERE skill = 'reiseplaner.wish-parse' ORDER BY id DESC LIMIT 1",
    );
    out.log(`skill_runs: ${JSON.stringify(runs[0])} (nur Hashes, kein Freitext)`);

    const app = createApp();
    const env = {
      ...wranglerVars(),
      LLM_ENABLED: 'false',
      HYPERDRIVE: { connectionString: stack.db.connectionString },
    } as unknown as Parameters<typeof app.request>[2];
    const off = await app.request(
      '/api/v1/wishes/parse',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: TEXT }) },
      env,
    );
    const fallback = (await off.json()) as { chips: string[]; translated: boolean; notice: string | null };
    out.log(`LLM_ENABLED=false → HTTP ${off.status}: translated=${fallback.translated}, chips=${JSON.stringify(fallback.chips)}`);
    out.log(`Hinweis: ${fallback.notice}`);
    const ok =
      JSON.stringify({ chips: body.chips, unmatched: body.unmatched }) ===
        '{"chips":["sauber","ruhig"],"unmatched":["Blick auf den See"]}' &&
      runs[0]?.outcome === 'ok' &&
      !fallback.translated &&
      fallback.chips.length === 0 &&
      Boolean(fallback.notice);
    out.log(ok ? '→ Zuordnung wie im Plan; ohne KI Fallback mit Hinweistext' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
