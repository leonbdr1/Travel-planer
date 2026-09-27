// S1.3 demo: health endpoint through the real entry point (HTTP → Worker in
// workerd → Hyperdrive → local database), then again with the database stopped.
import type { DemoOutput } from '../lib/output';
import { startDemoStack } from '../lib/stack';

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack (PGlite + Vite + workerd) …');
  const stack = await startDemoStack();
  try {
    const up = await fetch(`${stack.baseUrl}/api/v1/health`);
    out.log(`GET /api/v1/health → HTTP ${up.status}`);
    out.json(await up.json());
    out.log('stopping the local database …');
    await stack.stopDb();
    const down = await fetch(`${stack.baseUrl}/api/v1/health`);
    out.log(`GET /api/v1/health → HTTP ${down.status}`);
    out.json(await down.json());
    return up.status === 200 && down.status === 503 ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
