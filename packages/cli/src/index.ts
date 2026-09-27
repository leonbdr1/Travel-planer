// `npm run cli -- <command>`: operations CLI (catalog, geonames, validation,
// fixtures, cost report …). Commands never print secret values.
import { calibrateCommand } from './commands/calibrate';
import { costReportCommand } from './commands/cost-report';
import { catalogCommand } from './commands/catalog';
import { fixturesCommand } from './commands/fixtures';
import { geonamesCommand } from './commands/geonames';
import { liteapiCommand } from './commands/liteapi';
import { orsCommand } from './commands/ors';
import { secretsCommand } from './commands/secrets';

type Command = (args: string[], log: (line: string) => void) => Promise<number>;

const commands: Record<string, Command> = {
  calibrate: calibrateCommand,
  'cost-report': costReportCommand,
  ors: orsCommand,
  liteapi: liteapiCommand,
  catalog: catalogCommand,
  fixtures: fixturesCommand,
  geonames: geonamesCommand,
  secrets: secretsCommand,
};

const [name, ...args] = process.argv.slice(2);
const command = name ? commands[name] : undefined;
if (!command) {
  console.log(`usage: npm run cli -- <${Object.keys(commands).join('|')}> …`);
  process.exit(2);
}
process.exit(await command(args, (line) => console.log(line)));
