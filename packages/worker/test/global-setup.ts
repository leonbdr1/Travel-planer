import type { TestProject } from 'vitest/node';
import { startTestDbServer } from '@reiseplaner/db/testing';

export default async function setup(project: TestProject) {
  const server = await startTestDbServer();
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
