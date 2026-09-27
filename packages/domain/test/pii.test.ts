import { describe, expect, it } from 'vitest';
import { redactContactData } from '../src';

describe('contact data filter (architektur.md 9.3)', () => {
  it('replaces e-mail addresses and phone numbers', () => {
    expect(redactContactData('Schreibt an anna.muster@example.org für Fragen.')).toBe('Schreibt an [E-Mail] für Fragen.');
    expect(redactContactData('Ruft an: +49 170 1234567 oder 0171/7654321.')).toBe('Ruft an: [Telefon] oder [Telefon].');
    expect(redactContactData('Rezeption (030) 123 456 78')).toBe('Rezeption [Telefon]');
  });

  it('keeps dates, prices, room numbers and short codes', () => {
    const text = 'Am 01.09.2026 für 120 € in Zimmer 204, Code 0815.';
    expect(redactContactData(text)).toBe(text);
  });
});
