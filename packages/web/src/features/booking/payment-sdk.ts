// LiteAPI payment SDK (docs.liteapi.travel/docs/user-payment): a script that
// mounts Stripe's payment element into a target and redirects to `returnUrl`
// after a successful payment. The card data never touches our code.
import type { BookingCreateResponse } from '@reiseplaner/contracts';

export const PAYMENT_SDK_SCRIPT = 'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1';

export interface PaymentSdkConfig {
  publicKey: 'sandbox' | 'live';
  secretKey: string;
  targetElement: string;
  returnUrl: string;
  appearance: { theme: 'flat' };
}

/** The return URL keeps the path of the server's URL but uses the origin the browser is on. */
export function paymentSdkConfig(create: BookingCreateResponse, targetElement: string, origin: string): PaymentSdkConfig {
  const returnUrl = new URL(new URL(create.payment.return_url).pathname, origin).toString();
  return {
    publicKey: create.payment.mode,
    secretKey: create.payment.secret_key,
    targetElement,
    returnUrl,
    appearance: { theme: 'flat' },
  };
}

/**
 * Stripe sends the browser to `returnUrl` as soon as the payment is confirmed
 * or needs a further step (Link, 3-D Secure) and appends `redirect_status`.
 * Only `succeeded` may trigger the booking; without the parameter (simulated
 * payment) the page books as before.
 */
export function paymentReturnState(search: string): 'paid' | 'open' | 'failed' {
  const status = new URLSearchParams(search).get('redirect_status');
  if (status === null || status === 'succeeded') return 'paid';
  return status === 'failed' ? 'failed' : 'open';
}
