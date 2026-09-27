import type { TestProject } from 'vitest/node';
import { startTestDbServer } from '@reiseplaner/db/testing';
// Test-only import of the development seed (GeoNames extract and catalog
// draft); the CLI package is not a runtime dependency of the Worker.
import { seedDevData } from '@reiseplaner/cli/seed';

export default async function setup(project: TestProject) {
  const server = await startTestDbServer();
  await seedDevData(server.db, () => undefined);
  project.provide('dbConnectionString', server.connectionString);
  return async () => {
    await server.close();
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    dbConnectionString: string;
  }
}
