// Claims rule (konzept.md 7.9, architektur.md 6.13): UI texts and e-mail
// templates must not contain forbidden claims such as "Bestpreis" or
// "garantiert". Pure function; the file walking lives in scripts/check-claims.ts.

export interface ClaimViolation {
  line: number;
  claim: string;
  excerpt: string;
}

/** Removes // line comments and block comments so only text content is checked. */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:"'`])\/\/.*$/gm, (_m, prefix: string) => prefix);
}

export function findClaimViolations(source: string, forbidden: readonly string[]): ClaimViolation[] {
  const text = stripComments(source);
  const lines = text.split('\n');
  const violations: ClaimViolation[] = [];
  lines.forEach((line, index) => {
    const lower = line.toLocaleLowerCase('de-DE');
    for (const claim of forbidden) {
      if (lower.includes(claim.toLocaleLowerCase('de-DE'))) {
        violations.push({ line: index + 1, claim, excerpt: line.trim().slice(0, 160) });
      }
    }
  });
  return violations;
}
