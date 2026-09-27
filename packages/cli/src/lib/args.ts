export function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

/** Values following `--name` until the next `--flag`. */
export function flagList(args: string[], name: string): string[] {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return [];
  const out: string[] = [];
  for (let j = i + 1; j < args.length && !args[j]!.startsWith('--'); j += 1) out.push(args[j]!);
  return out;
}

export function parseLatLng(value: string): { lat: number; lng: number } {
  const [lat, lng] = value.split(',').map(Number);
  if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`expected "lat,lng", got "${value}"`);
  }
  return { lat, lng };
}
