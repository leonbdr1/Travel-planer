import type { Page } from '@playwright/test';

export type Mode = 'R' | 'P';

export interface StepOptions {
  /** Substrings that must appear in the visible body text after the step. */
  expectText?: string[];
  /** CSS selectors that must match at least one element after the step. */
  expectSelector?: string[];
  /** Substrings that must NOT appear in the visible body text. */
  rejectText?: string[];
  /** Screenshot of the full page instead of the viewport. */
  fullPage?: boolean;
}

export interface FlowContext {
  page: Page;
  baseUrl: string;
  step(title: string, action: () => Promise<void>, options?: StepOptions): Promise<void>;
  note(text: string): void;
}

export interface Flow {
  name: string;
  mode: Mode;
  description: string;
  run(ctx: FlowContext): Promise<void>;
}

export interface CheckResult {
  label: string;
  ok: boolean;
}

export interface StepRecord {
  index: number;
  title: string;
  url: string;
  screenshot: string | null;
  checks: CheckResult[];
  bodyText: string;
  aiLabels: string[];
  headings: string[];
  consoleErrors: string[];
  failedRequests: string[];
  error: string | null;
  notes: string[];
}
