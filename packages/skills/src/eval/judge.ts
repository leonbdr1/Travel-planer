// LLM judge for eval rubrics (real-model runs only; `--fake` skips rubrics).
// Part of the eval tooling, not of the product, so it is not a skill bundle.
import type { LlmPort } from '@reiseplaner/providers';
import { costUsd, priceFor, type PriceTable } from '../cost';

export interface JudgeVerdict {
  pass: boolean;
  reason: string;
  costUsd: number;
}

export type Judge = (args: { rubric: string; input: unknown; output: unknown; expected?: unknown }) => Promise<JudgeVerdict>;

const SYSTEM = `Du bist ein strenger Prüfer für die Ausgaben eines KI-Skills. Du erhältst die Eingabe, die Ausgabe und eine Bewertungsrubrik. Prüfe nur, ob die Rubrik erfüllt ist. Im Zweifel gilt sie als nicht erfüllt. Antworte ausschließlich mit dem Werkzeug submit_verdict.`;

export function createLlmJudge(llm: LlmPort, model: string, prices: PriceTable): Judge {
  const price = priceFor(prices, model);
  return async ({ rubric, input, output, expected }) => {
    const user = [
      `<rubrik>${rubric}</rubrik>`,
      `<eingabe>${JSON.stringify(input)}</eingabe>`,
      `<ausgabe>${JSON.stringify(output)}</ausgabe>`,
      expected === undefined ? '' : `<erwartet>${JSON.stringify(expected)}</erwartet>`,
    ].join('\n');
    const result = await llm.callTool({
      model,
      system: SYSTEM,
      user,
      tool: {
        name: 'submit_verdict',
        description: 'Urteil zur Rubrik.',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          required: ['pass', 'reason'],
          properties: { pass: { type: 'boolean' }, reason: { type: 'string', maxLength: 300 } },
        },
      },
      maxTokens: 400,
      temperature: price.sampling_params ? 0 : null,
    });
    const verdict = result.input as { pass?: unknown; reason?: unknown };
    return {
      pass: verdict.pass === true,
      reason: typeof verdict.reason === 'string' ? verdict.reason.slice(0, 300) : '',
      costUsd: result.billed ? costUsd(prices, model, result.usage) : 0,
    };
  };
}
