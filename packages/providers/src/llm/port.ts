// LLM port (architektur.md 9.1): one forced tool call per request, so the
// model can only answer with arguments for the skill's output tool.

export interface LlmTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LlmToolCall {
  model: string;
  system: string;
  user: string;
  tool: LlmTool;
  maxTokens: number;
  /** `null` omits sampling parameters (models that reject them, e.g. Sonnet 5). */
  temperature: number | null;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmToolResult {
  /** Arguments of the forced tool call; validated by the caller. */
  input: unknown;
  usage: LlmUsage;
  model: string;
  stopReason: string | null;
  /** false when the answer came from the simulated transport (costs nothing). */
  billed: boolean;
}

export interface LlmBatchRequest extends LlmToolCall {
  customId: string;
}

export type LlmBatchItem =
  | { customId: string; ok: true; result: LlmToolResult }
  | { customId: string; ok: false; error: string };

export interface LlmBatchOptions {
  pollIntervalMs?: number;
  /** Upper bound for waiting on the batch; Anthropic batches may take up to 24 h. */
  maxWaitMs?: number;
  onPoll?: (status: string) => void;
}

export interface LlmPort {
  readonly configured: boolean;
  callTool(call: LlmToolCall): Promise<LlmToolResult>;
  /** Message Batches API (CLI only): same requests, half the price, asynchronous. */
  batch(requests: LlmBatchRequest[], options?: LlmBatchOptions): Promise<LlmBatchItem[]>;
}
