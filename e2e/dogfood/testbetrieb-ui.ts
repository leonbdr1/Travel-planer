// One-off browser check of the Testbetrieb view (banner, booking off, map link)
// against a running stack: npx tsx e2e/dogfood/testbetrieb-ui.ts <base-url> <out-dir>
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { prepareSinglePlaceSearch } from './flows/helpers';

const [baseUrl = 'http://localhost:5173', outDir = 'dogfood-results/testbetrieb'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors: string[] = [];
page.on('console', (m) => void (m.type() === 'error' && errors.push(m.text())));
try {
  await page.goto(baseUrl);
  const banner = await page.getByTestId('dev-banner').innerText();
  console.log(`Banner: ${banner}`);
  await page.screenshot({ path: join(outDir, '01-startseite-testbetrieb.png'), animations: 'disabled' });
  await prepareSinglePlaceSearch(page, baseUrl);
  await page.getByTestId('start-search').click();
  await page.getByTestId('result-list').waitFor({ timeout: 90_000 });
  await page.getByTestId('result-name').first().click();
  await page.getByTestId('detail-offers').waitFor({ timeout: 15_000 });
  const map = page.getByTestId('find-on-map');
  const href = (await map.getAttribute('href')) ?? '';
  console.log(`Kartenlink: ${await map.innerText()} → ${href}`);
  const bookButtons = await page.getByTestId('book-offer').count();
  const offText = await page.getByText(/Buchen ist im Testbetrieb aus/).count();
  console.log(`Buchen-Knöpfe: ${bookButtons}, Hinweis „Buchen ist im Testbetrieb aus“: ${offText}×`);
  await page.screenshot({ path: join(outDir, '02-detail-testbetrieb.png'), fullPage: true, animations: 'disabled' });
  console.log(`Konsolenfehler: ${errors.length ? errors.join(' | ') : 'keine'}`);
  const ok = banner.startsWith('Testbetrieb') && href.startsWith('https://www.google.com/maps/search/?api=1&query=') && bookButtons === 0 && offText === 1 && errors.length === 0;
  console.log(ok ? '→ Testbetrieb-Ansicht wie geplant' : '→ UNEXPECTED');
  process.exitCode = ok ? 0 : 1;
} finally {
  await browser.close();
}
