// `npm run db:test`: fresh in-memory PGlite, all migrations, every pgTAP file
// under supabase/tests/. Prints TAP output and exits non-zero on any failure.
import { createPglite, pgliteDb } from '../pglite';
import { migrate, pgtapDir } from '../migrate';
import { listPgtapFiles, runPgtapFile } from '../pgtap';

const pg = await createPglite({ withPgtap: true });
await pg.exec('CREATE EXTENSION IF NOT EXISTS pgtap;');
const { applied } = await migrate(pgliteDb(pg));
console.log(`# migrations applied: ${applied.join(', ')}`);

let failures = 0;
let assertions = 0;
for (const file of listPgtapFiles(pgtapDir)) {
  const result = await runPgtapFile(pg, file);
  console.log(`# ${result.file}`);
  for (const line of result.lines) console.log(line);
  if (result.error) console.log(`not ok - ${result.file} aborted: ${result.error}`);
  assertions += result.passed + result.failed;
  if (!result.ok) failures += 1;
}
await pg.close();
console.log(`# ${assertions} assertions, ${failures === 0 ? 'all files passed' : `${failures} file(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
