/**
 * Скриншоты локального сервера для визуальной приёмки.
 * Puppeteer берётся из глобальной установки, в зависимости проекта не тянем.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire('/Users/vladimir/.npm-global/lib/node_modules/');
const puppeteer = require('/Users/vladimir/.npm-global/lib/node_modules/puppeteer');

const url = process.argv[2] ?? 'http://localhost:4321';
const label = process.argv[3] ?? '';
const width = Number(process.argv[4] ?? 1440);
const height = Number(process.argv[5] ?? 2200);
const scrollTo = Number(process.argv[6] ?? 0);   // смещение прокрутки в пикселях

const dir = './temporary screenshots';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const next = readdirSync(dir).filter((f) => f.startsWith('screenshot-')).length + 1;
const file = `${dir}/screenshot-${next}${label ? `-${label}` : ''}.png`;

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
if (scrollTo > 0) {
  await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
  await new Promise((r) => setTimeout(r, 400));
}
await page.screenshot({ path: file, fullPage: false });
await browser.close();
console.log(`saved ${file}  (${url} @ ${width}x${height})`);
