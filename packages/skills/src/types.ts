// Skill bundle types (architektur.md 9.1, Frontlift bundle format).

/** Ajv standalone validator (compiled at build time; Workers forbid runtime codegen). */
export interface CompiledValidator {
  (data: unknown): boolean;
  errors?: ReadonlyArray<{ instancePath: string; message?: string }> | null;
}

export interface SkillManifest {
  id: string;
  version: string;
  description: string;
  model: string;
  /** `null` for models that reject sampling parameters (see product.config.yaml ai.models). */
  temperature: number | null;
  maxTokens: number;
  costCapUsdPerCall: number;
  tool: { name: string; description: string };
  owners: string[];
  triggers: string[];
}

export interface SkillBundle {
  manifest: SkillManifest;
  system: string;
  userTemplate: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  validateInput: CompiledValidator;
  validateOutput: CompiledValidator;
}

export type SkillOutcome = 'ok' | 'error' | 'fallback' | 'skipped_budget';

export interface SkillRunRecord {
  skill: string;
  version: string;
  correlationId: string;
  inputHash: string;
  outputHash: string | null;
  latencyMs: number;
  costUsd: number;
  modelUsed: string | null;
  outcome: SkillOutcome;
  errorMessage: string | null;
  batch: boolean;
}

export class UnknownSkillError extends Error {
  constructor(id: string) {
    super(`unknown skill ${id}`);
    this.name = 'UnknownSkillError';
  }
}

export class SkillInputError extends Error {
  constructor(
    readonly skill: string,
    readonly issues: string[],
  ) {
    super(`invalid input for ${skill}: ${issues.join('; ')}`);
    this.name = 'SkillInputError';
  }
}

export function validatorIssues(validator: CompiledValidator): string[] {
  return (validator.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'invalid'}`);
}
