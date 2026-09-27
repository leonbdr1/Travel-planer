// `npm run demo -- <slice-id> [--save] [args]`: demonstrates a slice through
// its real entry point (CLI, HTTP). `--save` stores the output under
// docs/demos/<SLICE>/demo-output.txt as committed evidence.
import { DemoOutput } from './lib/output';

const [sliceArg, ...rest] = process.argv.slice(2);
if (!sliceArg) {
  console.error('usage: npm run demo -- <slice-id> [--save]');
  process.exit(2);
}
const slice = sliceArg.toLowerCase();
const save = rest.includes('--save');
const args = rest.filter((a) => a !== '--save');
const out = new DemoOutput(slice, `npm run demo -- ${[slice, ...args].join(' ')}`);

let mod: { run(out: DemoOutput, args: string[]): Promise<number> };
try {
  mod = await import(`./demos/${slice}.ts`);
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
    console.error(`no demo for slice ${slice}`);
    process.exit(2);
  }
  throw err;
}
const code = await mod.run(out, args);
if (save) console.log(`saved to ${out.save()}`);
process.exit(code);
