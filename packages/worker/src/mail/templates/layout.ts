// Shared frame of all e-mails: escaped HTML with inline styles and a plain
// text version. The footer names the operator's role (intermediary; the
// accommodation is the contracting party) and the support address.
import { productConfig } from '@reiseplaner/config';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatMoney(cents: number, currency: string): string {
  return currency === 'EUR' ? euro.format(cents / 100) : `${(cents / 100).toFixed(2)} ${currency}`;
}

/** "Fr, 02.10.2026" for an ISO date. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso.slice(0, 10)}T12:00:00Z`),
  );
}

/** "30.09.2026, 18:00 Uhr" in Europe/Berlin. */
export function formatDateTime(iso: string): string {
  return `${new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: productConfig.markets.timezone,
  }).format(new Date(iso))} Uhr`;
}

export interface Row {
  label: string;
  value: string;
}

export function rowsHtml(rows: readonly Row[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0">${rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#52525b;vertical-align:top;white-space:nowrap">${escapeHtml(r.label)}</td><td style="padding:6px 0;color:#18181b;font-weight:600">${escapeHtml(r.value)}</td></tr>`,
    )
    .join('')}</table>`;
}

export function rowsText(rows: readonly Row[]): string {
  return rows.map((r) => `${r.label}: ${r.value}`).join('\n');
}

function footerLines(): string[] {
  return [
    productConfig.operator.role_statement,
    `Fragen? Schreib uns an ${productConfig.support.email}.`,
    `${productConfig.name} · ${productConfig.operator.company}`,
  ];
}

export function layout(title: string, bodyHtml: string, bodyText: string, subject: string): RenderedEmail {
  const brand = productConfig.brand.colors.primary;
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f4f4f5;font-family:${escapeHtml(productConfig.brand.fonts.sans)};color:#18181b">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="font-size:18px;font-weight:700;color:${brand};margin-bottom:16px">${escapeHtml(productConfig.name)}</div>
<div style="background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e4e4e7">
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
${bodyHtml}
</div>
<p style="font-size:12px;color:#71717a;line-height:1.5;margin-top:16px">${footerLines().map(escapeHtml).join('<br>')}</p>
</div></body></html>`;
  const text = `${title}\n\n${bodyText}\n\n--\n${footerLines().join('\n')}\n`;
  return { subject, html, text };
}

export function buttonHtml(url: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:${productConfig.brand.colors.primary};color:${productConfig.brand.colors.primary_contrast};padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(label)}</a></p>`;
}
