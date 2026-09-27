import { createHash } from 'node:crypto';

/** Deterministic UUID (version 5 layout) from an arbitrary string. */
export function stableUuid(input: string): string {
  const h = createHash('sha256').update(input).digest('hex');
  const variant = ((Number.parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}
