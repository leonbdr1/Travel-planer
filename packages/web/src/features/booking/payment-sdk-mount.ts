// Browser side of the LiteAPI payment SDK: loads the script and mounts the
// form. Kept apart from payment-sdk.ts (pure, tested in Node without a DOM).
import type { BookingCreateResponse } from '@reiseplaner/contracts';
import { PAYMENT_SDK_SCRIPT, paymentSdkConfig, type PaymentSdkConfig } from './payment-sdk';

interface PaymentSdkGlobal {
  LiteAPIPayment?: new (config: PaymentSdkConfig) => { handlePayment(): Promise<void> | void };
}

function loadScript(): Promise<void> {
  return new Promise((done, fail) => {
    if ((window as unknown as PaymentSdkGlobal).LiteAPIPayment) return done();
    const script = document.createElement('script');
    script.src = PAYMENT_SDK_SCRIPT;
    script.async = true;
    script.onload = () => done();
    script.onerror = () => fail(new Error('payment sdk not loadable'));
    document.head.appendChild(script);
  });
}

/** Loads the SDK and mounts the payment form. Rejects when the script cannot be loaded. */
export async function mountPaymentSdk(create: BookingCreateResponse, targetElement: string): Promise<void> {
  await loadScript();
  const Sdk = (window as unknown as PaymentSdkGlobal).LiteAPIPayment;
  if (!Sdk) throw new Error('payment sdk missing');
  await new Sdk(paymentSdkConfig(create, targetElement, window.location.origin)).handlePayment();
}
