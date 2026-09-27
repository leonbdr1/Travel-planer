import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigError, defaultConfigPath, loadProductConfig, parseProductConfig } from '../src/node';
import { renderBrandCss, renderConfigModule } from '../src/render';
import { productConfig } from '../src/index';

const fixture = (name: string) => resolve(import.meta.dirname, 'fixtures', name);

describe('product configuration', () => {
  it('validates the committed product.config.yaml', () => {
    const config = loadProductConfig(defaultConfigPath);
    expect(config.slug).toBe('reiseplaner');
    expect(config.markets.currency).toBe('EUR');
    expect(config.limits.search.max_combinations).toBe(120);
  });

  it('rejects a broken configuration with zod paths', () => {
    let error: unknown;
    try {
      loadProductConfig(fixture('broken.yaml'));
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(ConfigError);
    const paths = (error as ConfigError).issues.map((i) => i.path);
    expect(paths).toEqual(
      expect.arrayContaining(['markets.currency', 'support.email', 'limits.search.max_places']),
    );
  });

  it('rejects unknown keys so typos cannot slip through', () => {
    const source = readFileSync(defaultConfigPath, 'utf8').replace('tagline:', 'tagline_typo: x\ntagline:');
    expect(() => parseProductConfig(source)).toThrow(/tagline_typo/);
  });

  it('keeps the generated module in sync with the YAML', () => {
    const config = loadProductConfig(defaultConfigPath);
    const generated = readFileSync(resolve(import.meta.dirname, '../src/generated/product-config.ts'), 'utf8');
    expect(generated).toBe(renderConfigModule(config));
    const css = readFileSync(resolve(import.meta.dirname, '../src/generated/brand.css'), 'utf8');
    expect(css).toBe(renderBrandCss(config));
    expect(productConfig).toEqual(config);
  });
});
