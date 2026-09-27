// E-mail adapter (Resend, architektur.md E10) behind the MailPort.
import { z } from 'zod';
import { ProviderError } from '../http/errors';
import { requestJson, type FetchLike } from '../http/request';

export interface MailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface MailPort {
  send(message: MailMessage): Promise<{ providerMessageId: string }>;
}

const resendResponse = z.object({ id: z.string() });

export interface ResendClientOptions {
  apiKey: string | undefined;
  fetch: FetchLike;
  baseUrl?: string;
  onCall?: (endpoint: string) => void;
}

export function createResendClient(options: ResendClientOptions): MailPort {
  return {
    async send(message) {
      if (!options.apiKey) throw new ProviderError('resend', 'not_configured', 'RESEND_API_KEY is not set');
      const res = await requestJson({
        provider: 'resend',
        endpoint: 'emails',
        url: `${options.baseUrl ?? 'https://api.resend.com'}/emails`,
        schema: resendResponse,
        fetch: options.fetch,
        headers: { Authorization: `Bearer ${options.apiKey}` },
        body: {
          from: message.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        },
        timeoutMs: 10_000,
        maxRetries: 1,
        ...(options.onCall ? { onAttempt: options.onCall } : {}),
      });
      return { providerMessageId: res.id };
    },
  };
}
