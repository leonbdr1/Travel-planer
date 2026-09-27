// Generates the typed product configuration module and the brand theme CSS
// from product.config.yaml. Both outputs are committed; CI verifies the tree
// is unchanged after `npm run gen`, so the YAML stays the single source.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProductConfig, ConfigError } from '../node';
import { renderBrandCss, renderConfigModule } from '../render';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../generated');

function writeIfChanged(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return true;
}

function main(): void {
  const args = process.argv.slice(2);
  const configIdx = args.indexOf('--config');
  const configPath = configIdx >= 0 ? args[configIdx + 1] : undefined;
  try {
    const config = loadProductConfig(configPath);
    const changed = [
      writeIfChanged(resolve(outDir, 'product-config.ts'), renderConfigModule(config)),
      writeIfChanged(resolve(outDir, 'brand.css'), renderBrandCss(config)),
    ].some(Boolean);
    if (!args.includes('--quiet') || changed) {
      console.log(`config: ${changed ? 'generated' : 'up to date'} (${config.slug})`);
    }
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}

main();
