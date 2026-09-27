import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const localDataDir = resolve(repoRoot, '.data/pglite');
export const DEFAULT_LOCAL_DB_PORT = 54329;
