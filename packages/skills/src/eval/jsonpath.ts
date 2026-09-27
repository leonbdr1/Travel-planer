// JSONPath subset for eval assertions: `$`, `.key`, `[n]`, `[*]` and
// recursive descent `..key`.

type Step = { kind: 'key'; key: string } | { kind: 'index'; index: number } | { kind: 'wildcard' } | { kind: 'descend'; key: string };

export function parsePath(path: string): Step[] {
  if (!path.startsWith('$')) throw new Error(`JSONPath must start with $: ${path}`);
  const steps: Step[] = [];
  const re = /\.\.([A-Za-z_][\w-]*)|\.([A-Za-z_][\w-]*)|\[(\d+)\]|\[\*\]/gy;
  re.lastIndex = 1;
  while (re.lastIndex < path.length) {
    const start = re.lastIndex;
    const m = re.exec(path);
    if (!m || m.index !== start) throw new Error(`unsupported JSONPath at "${path.slice(start)}"`);
    if (m[1] !== undefined) steps.push({ kind: 'descend', key: m[1] });
    else if (m[2] !== undefined) steps.push({ kind: 'key', key: m[2] });
    else if (m[3] !== undefined) steps.push({ kind: 'index', index: Number(m[3]) });
    else steps.push({ kind: 'wildcard' });
  }
  return steps;
}

function descend(value: unknown, key: string, out: unknown[]): void {
  if (Array.isArray(value)) {
    for (const v of value) descend(v, key, out);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === key) out.push(v);
      descend(v, key, out);
    }
  }
}

export function queryPath(root: unknown, path: string): unknown[] {
  let current: unknown[] = [root];
  for (const step of parsePath(path)) {
    const next: unknown[] = [];
    for (const value of current) {
      if (step.kind === 'key') {
        if (value && typeof value === 'object' && !Array.isArray(value) && step.key in value) {
          next.push((value as Record<string, unknown>)[step.key]);
        }
      } else if (step.kind === 'index') {
        if (Array.isArray(value) && step.index < value.length) next.push(value[step.index]);
      } else if (step.kind === 'wildcard') {
        if (Array.isArray(value)) next.push(...value);
        else if (value && typeof value === 'object') next.push(...Object.values(value));
      } else {
        descend(value, step.key, next);
      }
    }
    current = next;
  }
  return current;
}

/** Wildcard/descent paths yield many values; a plain path to an array is treated as its items. */
export function queryItems(root: unknown, path: string): unknown[] {
  const values = queryPath(root, path);
  const multi = /\[\*\]|\.\./.test(path);
  if (!multi && values.length === 1 && Array.isArray(values[0])) return values[0] as unknown[];
  return values;
}
