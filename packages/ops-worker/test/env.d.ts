// Types for `cloudflare:workers` in tests. Heritage clauses must name an
// identifier (an `import()` type there is silently dropped under skipLibCheck).
type OpsBindings = import('../src/env').OpsEnv;

declare namespace Cloudflare {
  interface Env extends OpsBindings {}
}
