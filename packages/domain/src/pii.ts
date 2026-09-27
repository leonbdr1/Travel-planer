// Contact data filter for texts that go to the AI (architektur.md 9.3):
// e-mail addresses and phone numbers are replaced by placeholders. Author
// names never reach the review path (the provider adapter drops them).

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu;
// International (+49 …, 0049 …) or national (0171 …, (030) …) numbers with
// at least 7 digits; dots are not separators, so dates like 01.09.2026 stay.
const PHONE = /(?<![\p{L}\p{N}])(?:\+|00|\(?0)[\d\s/()-]{5,}\d(?![\p{L}\p{N}])/gu;

export const REDACTED_EMAIL = '[E-Mail]';
export const REDACTED_PHONE = '[Telefon]';

export function redactContactData(text: string): string {
  return text.replace(EMAIL, REDACTED_EMAIL).replace(PHONE, (m) => (m.replace(/\D/g, '').length >= 7 ? REDACTED_PHONE : m));
}
