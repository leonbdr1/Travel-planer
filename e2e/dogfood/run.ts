// `npm run dogfood -- --mode R|P [--flow <name>] [--base-url <url>] [--save <dir>]`
//
// Walkthrough against the really running stack (fi-deck dogfood runbook):
// starts `scripts/dev.ts` on free ports with a throwaway data directory
// (unless --base-url is given), drives Chromium, reads the rendered DOM and
// writes dogfood-results/<run>/report.md with screenshots. A walkthrough is
// not an e2e assertion suite: the report must be read by a human.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { flows as allFlows } from './flows';
import { passed, writeReport, type RunSummary } from './report';
import { startStack, type Stack } from './stack';
import type { Flow, FlowContext, Mode, StepOptions, StepRecord } from './types';

const repoRoot = resolve(import.meta.dirname, '../..');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const mode = (arg('mode') ?? 'R') as Mode;
if (mode !== 'R' && mode !== 'P') throw new Error('--mode must be R or P');
const flowName = arg('flow');
const selected = allFlows.filter((f) => (flowName ? f.name === flowName : f.mode === mode));
if (selected.length === 0) {
  console.error(`no flow found (mode ${mode}${flowName ? `, flow ${flowName}` : ''}); known: ${allFlows.map((f) => `${f.name} (${f.mode})`).join(', ')}`);
  process.exit(2);
}

const gitSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: repoRoot }).toString().trim();
  } catch {
    return 'unknown';
  }
})();
const startedAt = new Date().toISOString();
const runId = `${startedAt.slice(0, 19).replace(/:/g, '-')}-${mode}-${flowName ?? 'all'}`;
const outDir = join(repoRoot, 'dogfood-results', runId);
mkdirSync(outDir, { recursive: true });

async function visibleState(page: Page) {
  return page.evaluate(() => ({
    bodyText: document.body.innerText,
    headings: Array.from(document.querySelectorAll('h1, h2')).map((h) => (h as HTMLElement).innerText.trim()),
    aiLabels: Array.from(document.querySelectorAll('[data-ai-provenance]')).map(
      (el) => `${(el as HTMLElement).innerText.trim()} [${el.getAttribute('data-ai-provenance')}]`,
    ),
  }));
}

async function runFlow(flow: Flow, page: Page, baseUrl: string, counter: { n: number }) {
  const steps: StepRecord[] = [];
  let consoleErrors: string[] = [];
  let failedRequests: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message.slice(0, 300)}`));
  page.on('response', (res) => {
    if (res.status() >= 500) failedRequests.push(`${res.status()} ${new URL(res.url()).pathname}`);
  });
  page.on('requestfailed', (req) => {
    const failure = req.failure()?.errorText ?? 'failed';
    if (!failure.includes('ERR_ABORTED')) failedRequests.push(`${failure} ${new URL(req.url()).pathname}`);
  });

  let pendingNotes: string[] = [];
  const ctx: FlowContext = {
    page,
    baseUrl,
    note: (text) => pendingNotes.push(text),
    async step(title: string, action: () => Promise<void>, options: StepOptions = {}) {
      counter.n += 1;
      const index = counter.n;
      let error: string | null = null;
      try {
        await action();
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      } catch (err) {
        error = (err as Error).message.split('\n')[0] ?? String(err);
      }
      const slug = title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);
      const screenshot = `${String(index).padStart(2, '0')}-${slug}.png`;
      let shotOk = true;
      await page.screenshot({ path: join(outDir, screenshot), fullPage: options.fullPage ?? true }).catch(() => {
        shotOk = false;
      });
      const state = await visibleState(page).catch(() => ({ bodyText: '', headings: [], aiLabels: [] }));
      const checks = [
        ...(options.expectText ?? []).map((t) => ({ label: `enthält „${t}“`, ok: state.bodyText.includes(t) })),
        ...(options.rejectText ?? []).map((t) => ({ label: `enthält nicht „${t}“`, ok: !state.bodyText.includes(t) })),
      ];
      for (const selector of options.expectSelector ?? []) {
        const count = await page.locator(selector).count().catch(() => 0);
        checks.push({ label: `Element \`${selector}\` vorhanden (${count})`, ok: count > 0 });
      }
      steps.push({
        index,
        title,
        url: page.url().replace(baseUrl, ''),
        screenshot: shotOk ? screenshot : null,
        checks,
        bodyText: state.bodyText,
        aiLabels: state.aiLabels,
        headings: state.headings,
        consoleErrors,
        failedRequests,
        error,
        notes: pendingNotes,
      });
      consoleErrors = [];
      failedRequests = [];
      pendingNotes = [];
      if (error) throw new Error(`step „${title}“ failed: ${error}`);
    },
  };
  let flowError: string | null = null;
  try {
    await flow.run(ctx);
  } catch (err) {
    flowError = (err as Error).message.split('\n')[0] ?? String(err);
  }
  return { flow, steps, error: flowError };
}

let stack: Stack | undefined;
const externalBase = arg('base-url');
let exitCode = 1;
try {
  if (externalBase) {
    console.log(`dogfood: using running stack at ${externalBase}`);
  } else {
    console.log('dogfood: starting throwaway stack …');
    stack = await startStack(repoRoot, join(outDir, '.stack'));
    console.log(`dogfood: stack ready at ${stack.baseUrl}`);
  }
  const baseUrl = externalBase ?? stack!.baseUrl;
  const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
  const summary: RunSummary = { runId, mode, flows: [], baseUrl, gitSha, startedAt };
  const counter = { n: 0 };
  try {
    for (const flow of selected) {
      const context = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      summary.flows.push(await runFlow(flow, page, baseUrl, counter));
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const reportPath = writeReport(outDir, summary);
  console.log(`dogfood: report written to ${reportPath.replace(`${repoRoot}/`, '')}`);
  const saveTo = arg('save');
  if (saveTo) {
    const target = resolve(repoRoot, saveTo);
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    for (const file of readdirSync(outDir)) {
      if (file.endsWith('.png') || file === 'report.md') cpSync(join(outDir, file), join(target, file));
    }
    console.log(`dogfood: report and screenshots copied to ${saveTo}`);
  }
  exitCode = passed(summary) ? 0 : 1;
  console.log(`dogfood: ${exitCode === 0 ? 'passed' : 'FAILED'}`);
} catch (err) {
  console.error(`dogfood: ${(err as Error).message}`);
} finally {
  await stack?.stop();
  rmSync(join(outDir, '.stack'), { recursive: true, force: true });
}
process.exit(exitCode);
