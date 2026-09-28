// Log hygiene (architektur.md 11.1): e-mail addresses masked, token-like
// strings removed. Structured logs name ids and error kinds; this filter is
// the safety net for free-form messages (only logged in dev and test).
const EMAIL = /([\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]*@([\p{L}\p{N}.-]+\.\p{L}{2,})/gu;
// base64url / hex runs of 32+ characters (search and booking tokens, keys, hashes).
const TOKEN = /[A-Za-z0-9_-]{32,}(?:\.[A-Za-z0-9_-]{16,})?/g;
// Row ids are UUIDs; they identify records, not people, and stay readable.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function redactForLog(text: string): string {
  return text.replace(EMAIL, '$1***@$2').replace(TOKEN, (m) => (UUID.test(m) ? m : '[redacted]'));
}
