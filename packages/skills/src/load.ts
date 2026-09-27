// Node-only bundle loader (build script, evals, CLI): reads the bundle
// directories, validates skill.yaml and cross-checks references, template
// slots, schemas and the price table.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { templateSlots } from './render';
import type { PriceTable } from './cost';
import type { SkillManifest } from './types';

export const bundlesDir = resolve(import.meta.dirname, '../bundles');

const semver = /^\d+\.\d+\.\d+$/;

export const skillManifestSchema = z.strictObject({
  id: z.string().regex(/^reiseplaner\.[a-z][a-z0-9-]*$/),
  version: z.string().regex(semver),
  description: z.string().min(10),
  model: z.string().min(1),
  temperature: z.number().min(0).max(1).nullable(),
  maxTokens: z.int().positive().max(16_000),
  costCapUsdPerCall: z.number().positive(),
  systemRef: z.literal('system.md'),
  userTemplateRef: z.literal('user.template.md'),
  inputSchemaRef: z.literal('input.schema.json'),
  outputSchemaRef: z.literal('output.schema.json'),
  tool: z.strictObject({ name: z.string().regex(/^[a-z][a-z0-9_]{2,63}$/), description: z.string().min(10) }),
  owners: z.array(z.string().min(1)).min(1),
  triggers: z.array(z.string().min(1)).min(1),
});

export interface RawBundle {
  dir: string;
  manifest: SkillManifest;
  system: string;
  userTemplate: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export class BundleError extends Error {
  constructor(
    readonly bundle: string,
    message: string,
  ) {
    super(`${bundle}: ${message}`);
    this.name = 'BundleError';
  }
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function readJson(path: string, bundle: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
    return value as Record<string, unknown>;
  } catch (err) {
    throw new BundleError(bundle, `${path}: ${(err as Error).message}`);
  }
}

/** Loads the newest version of one bundle directory. */
export function loadBundle(dir: string, prices: PriceTable): RawBundle {
  const name = dir.split('/').pop() ?? dir;
  const versions = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^v\d+\.\d+\.\d+$/.test(d.name))
    .map((d) => d.name.slice(1))
    .sort(compareSemver);
  const version = versions.at(-1);
  if (!version) throw new BundleError(name, 'no version directory v<semver>');
  const vdir = join(dir, `v${version}`);
  const parsed = skillManifestSchema.safeParse(parse(readFileSync(join(vdir, 'skill.yaml'), 'utf8')));
  if (!parsed.success) {
    throw new BundleError(name, `skill.yaml: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  const m = parsed.data;
  if (m.id !== name) throw new BundleError(name, `id ${m.id} does not match the directory`);
  if (m.version !== version) throw new BundleError(name, `version ${m.version} does not match v${version}`);
  const price = prices.models[m.model];
  if (!price) throw new BundleError(name, `model ${m.model} has no price in product.config.yaml ai.models`);
  if (!price.sampling_params && m.temperature !== null) {
    throw new BundleError(name, `model ${m.model} rejects sampling parameters: set temperature: null`);
  }
  if (price.sampling_params && m.temperature === null) {
    throw new BundleError(name, `model ${m.model} accepts temperature: set it explicitly (0 for deterministic skills)`);
  }
  for (const f of ['README.md', 'baseline.json', 'evals/dataset.jsonl']) {
    if (!existsSync(join(dir, f))) throw new BundleError(name, `missing ${f}`);
  }
  const system = readFileSync(join(vdir, m.systemRef), 'utf8');
  const userTemplate = readFileSync(join(vdir, m.userTemplateRef), 'utf8');
  const inputSchema = readJson(join(vdir, m.inputSchemaRef), name);
  const outputSchema = readJson(join(vdir, m.outputSchemaRef), name);
  const properties = Object.keys((inputSchema.properties ?? {}) as Record<string, unknown>);
  const unknownSlots = templateSlots(userTemplate).filter((s) => !properties.includes(s));
  if (unknownSlots.length > 0) throw new BundleError(name, `template slots without input property: ${unknownSlots.join(', ')}`);
  if (outputSchema.type !== 'object') throw new BundleError(name, 'output schema must be an object (tool input)');
  const { systemRef: _s, userTemplateRef: _u, inputSchemaRef: _i, outputSchemaRef: _o, ...manifest } = m;
  return { dir, manifest, system, userTemplate, inputSchema, outputSchema };
}

export function loadAllBundles(prices: PriceTable, root = bundlesDir): RawBundle[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => loadBundle(join(root, d.name), prices))
    .sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
}
