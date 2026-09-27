// Node-only helpers: read and validate product.config.yaml from disk.
// Workers and the SPA import the generated constant from ./index instead.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { z } from 'zod';
import { productConfigSchema, type ProductConfig } from './schema';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const defaultConfigPath = resolve(repoRoot, 'product.config.yaml');

export class ConfigError extends Error {
  constructor(
    message: string,
    readonly issues: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function parseProductConfig(source: string, origin = 'product.config.yaml'): ProductConfig {
  let raw: unknown;
  try {
    raw = parse(source);
  } catch (err) {
    throw new ConfigError(`${origin}: invalid YAML (${(err as Error).message})`, []);
  }
  const result = productConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.map(String).join('.') || '(root)',
      message: issue.message,
    }));
    throw new ConfigError(
      `${origin}: ${issues.length} validation error(s)\n${z.prettifyError(result.error)}`,
      issues,
    );
  }
  return result.data;
}

export function loadProductConfig(path: string = defaultConfigPath): ProductConfig {
  return parseProductConfig(readFileSync(path, 'utf8'), path);
}
