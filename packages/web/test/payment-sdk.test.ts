// Configuration of the LiteAPI payment SDK (docs.liteapi.travel user-payment):
// publicKey is the environment, secretKey is the prebook's, returnUrl is the
// page that finalizes the booking.
import { describe, expect, it } from 'vitest';
import type { BookingCreateResponse } from '@reiseplaner/contracts';
import { PAYMENT_SDK_SCRIPT, paymentSdkConfig } from '../src/features/booking/payment-sdk';

const create = (over: Partial<BookingCreateResponse['payment']> = {}): BookingCreateResponse => ({
  booking_ref: 'RP-ABC234',
  session_token: 'session-token-0123456789abcdef',
  price: { total_eur: 412.5, currency: 'EUR' },
  previous_price: { total_eur: 412.5, currency: 'EUR' },
  price_changed: false,
  payment: {
    secret_key: 'pi_test_secret_xyz',
    mode: 'sandbox',
    simulated: false,
    return_url: 'http://127.0.0.1:8787/buchung/RP-ABC234/abschluss',
    ...over,
  },
});

describe('paymentSdkConfig', () => {
  it('uses the environment as publicKey and the prebook secret', () => {
    const cfg = paymentSdkConfig(create(), '#payment', 'http://localhost:5173');
    expect(cfg.publicKey).toBe('sandbox');
    expect(cfg.secretKey).toBe('pi_test_secret_xyz');
    expect(cfg.targetElement).toBe('#payment');
    expect(paymentSdkConfig(create({ mode: 'live' }), '#payment', 'https://x.example').publicKey).toBe('live');
  });

  it('returns to the browser origin, not the origin the worker saw behind the dev proxy', () => {
    const cfg = paymentSdkConfig(create(), '#payment', 'http://localhost:5173');
    expect(cfg.returnUrl).toBe('http://localhost:5173/buchung/RP-ABC234/abschluss');
  });

  it('loads the script from the host the CSP allows', () => {
    expect(PAYMENT_SDK_SCRIPT).toBe('https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1');
  });
});
