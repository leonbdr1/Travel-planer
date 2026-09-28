// `npm run smoke -- --base-url <url> [--expect-env staging|production] [--save <file>]`:
// read-only smoke test after a deploy (S10.1, docs/runbooks/go-live-checkliste.md).
// Exit code 0 only when every check passes.
import { writeFileSync } from 'node:fs';
import { formatSmoke, runSmoke, type SmokeEnv } from './commands/smoke';
import { flag } from './lib/args';

const args = process.argv.slice(2);
const baseUrl = flag(args, 'base-url');
const expectEnv = flag(args, 'expect-env');
if (!baseUrl || (expectEnv !== undefined && expectEnv !== 'staging' && expectEnv !== 'production')) {
  console.error('usage: npm run smoke -- --base-url <url> [--expect-env staging|production] [--save <file>]');
  process.exit(2);
}
const checks = await runSmoke(baseUrl, expectEnv ? { expectEnv: expectEnv as SmokeEnv } : {});
const lines = formatSmoke(baseUrl, checks, new Date());
for (const line of lines) console.log(line);
const save = flag(args, 'save');
if (save) writeFileSync(save, `$ npm run smoke -- ${args.filter((a, i) => a !== '--save' && args[i - 1] !== '--save').join(' ')}\n${lines.join('\n')}\n`);
process.exit(checks.every((c) => c.ok) ? 0 : 1);
