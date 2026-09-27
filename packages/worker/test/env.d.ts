// Types for `cloudflare:workers` in tests. Heritage clauses must name an
// identifier (an `import()` type there is silently dropped under skipLibCheck).
type WorkerBindings = import('../src/env').Env;

declare namespace Cloudflare {
  interface Env extends WorkerBindings {}
  interface GlobalProps {
    mainModule: typeof import('../src/index');
  }
}
