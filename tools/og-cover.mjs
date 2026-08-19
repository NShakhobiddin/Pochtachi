#!/usr/bin/env node
// Ijtimoiy tarmoqlar uchun muqova rasmini yasaydi: tools/og-cover.html -> icons/og-cover.png
// Ishlatish: node tools/og-cover.mjs   (Playwright va internet kerak — shriftlar Google Fonts'dan)

import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error("playwright topilmadi. `npm i -D playwright` yoki NODE_PATH ni global modullarga qarating.");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(join(ROOT, 'tools', 'og-cover.html')).href, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: join(ROOT, 'icons', 'og-cover.png') });
await browser.close();
console.log('icons/og-cover.png yozildi (1200x630).');
