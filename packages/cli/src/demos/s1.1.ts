// S1.1 demo: prints the validated product configuration. With
// `--config <file>` it validates that file instead and exits 1 on errors.
// Without arguments it also shows the rejection of the broken test fixture.
import { ConfigError, loadProductConfig } from '@reiseplaner/config/node';
import type { DemoOutput } from '../lib/output';

const brokenFixture = 'packages/config/test/fixtures/broken.yaml';

function validate(out: DemoOutput, path: string | undefined): boolean {
  try {
    const config = loadProductConfig(path);
    out.log(`validated ${path ?? 'product.config.yaml'}:`);
    out.json({
      id: config.id,
      name: config.name,
      slug: config.slug,
      currency: config.markets.currency,
      language: config.markets.language,
      catalog_countries: config.markets.catalog_countries,
      limits: config.limits.search,
      forbidden_claims: config.compliance.forbidden_claims.length,
    });
    return true;
  } catch (err) {
    if (err instanceof ConfigError) {
      out.log(err.message);
      out.log('failing paths:', err.issues.map((i) => i.path));
      return false;
    }
    throw err;
  }
}

export async function run(out: DemoOutput, args: string[]): Promise<number> {
  const i = args.indexOf('--config');
  if (i >= 0) return validate(out, args[i + 1]) ? 0 : 1;
  const ok = validate(out, undefined);
  out.log('');
  out.log(`$ npm run demo -- s1.1 --config ${brokenFixture}`);
  const brokenRejected = !validate(out, brokenFixture);
  out.log(brokenRejected ? '→ exit 1 (rejected as expected)' : '→ UNEXPECTED: broken fixture accepted');
  return ok && brokenRejected ? 0 : 1;
}
