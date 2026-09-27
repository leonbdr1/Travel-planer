// Demo output helper: prints to stdout and, with --save, writes the same text
// to docs/demos/<SLICE>/demo-output.txt (evidence in the tree).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';

export class DemoOutput {
  private readonly lines: string[] = [];
  constructor(
    readonly slice: string,
    readonly command: string,
  ) {}

  log(...parts: unknown[]): void {
    const line = parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ');
    this.lines.push(line);
    console.log(line);
  }

  json(value: unknown): void {
    const text = JSON.stringify(value, null, 2);
    this.lines.push(text);
    console.log(text);
  }

  save(): string {
    const dir = join(repoRoot, 'docs/demos', this.slice.toUpperCase());
    mkdirSync(dir, { recursive: true });
    const header = [`$ ${this.command}`, `# recorded ${new Date().toISOString()}`, ''];
    const path = join(dir, 'demo-output.txt');
    writeFileSync(path, `${[...header, ...this.lines].join('\n')}\n`);
    return path;
  }
}
