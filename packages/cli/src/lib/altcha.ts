// Solves the ALTCHA challenge of the running stack like the browser does.
import { solveChallenge, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/web/sha';

export async function altchaPayload(baseUrl: string): Promise<string> {
  const challenge = (await (await fetch(`${baseUrl}/api/v1/meta/altcha-challenge`)).json()) as Challenge;
  const solution = await solveChallenge({ challenge, deriveKey });
  if (!solution) throw new Error('ALTCHA challenge not solved');
  return Buffer.from(JSON.stringify({ challenge, solution })).toString('base64');
}
