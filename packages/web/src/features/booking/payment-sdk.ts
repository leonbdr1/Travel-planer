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
