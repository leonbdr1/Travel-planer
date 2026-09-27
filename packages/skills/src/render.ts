// {{slot}} interpolation for user templates. Strings are inserted verbatim
// except for angle brackets, which become look-alikes so user text cannot
// close the XML-style tags the prompts use as delimiters. Other values are
// inserted as JSON.

const SLOT = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function templateSlots(template: string): string[] {
  return [...new Set([...template.matchAll(SLOT)].map((m) => m[1] ?? ''))];
}

export function neutralizeTags(text: string): string {
  return text.replaceAll('<', '‹').replaceAll('>', '›');
}

export function renderTemplate(template: string, input: Record<string, unknown>): string {
  return template.replace(SLOT, (_, name: string) => {
    const value = input[name];
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return neutralizeTags(value);
    return neutralizeTags(JSON.stringify(value, null, 2));
  });
}
