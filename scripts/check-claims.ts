// `npm run check:claims`: fails the build when a UI text or e-mail template
// contains a forbidden claim from product.config.yaml (compliance.forbidden_claims).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { loadProductConfig } from '@reiseplaner/config/node';
import { findClaimViolations } from '../packages/domain/src/claims';

const root = resolve(import.meta.dirname, '..');
const targets = ['packages/web/src/i18n', 'packages/worker/src/mail/templates', 'packages/domain/src/texts.ts'];

function walk(dir: string): string[] {
  try {
    if (statSync(dir).isFile()) return [dir];
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(entry) ? [path] : [];
    });
  } catch {
    return [];
  }
}

const { forbidden_claims: forbidden } = loadProductConfig().compliance;
const files = targets.flatMap((t) => walk(resolve(root, t)));
let count = 0;
for (const file of files) {
  for (const v of findClaimViolations(readFileSync(file, 'utf8'), forbidden)) {
    count += 1;
    console.error(`${relative(root, file)}:${v.line}: forbidden claim „${v.claim}“ in: ${v.excerpt}`);
  }
}
if (count > 0) {
  console.error(`check:claims: ${count} violation(s) in ${files.length} file(s)`);
  process.exit(1);
}
console.log(`check:claims: ok (${files.length} file(s), ${forbidden.length} forbidden claims checked)`);
