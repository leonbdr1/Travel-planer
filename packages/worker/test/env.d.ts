declare namespace Cloudflare {
  interface Env extends import('../src/env').Env {}
  interface GlobalProps {
    mainModule: typeof import('../src/index');
  }
}
