#!/usr/bin/env node
// Kuryer logotiplarini veb uchun tayyorlaydi: logos/src/*.png -> logos/*.webp
//
// Asl PNG'lar o'rtacha 440x440 va 1,6 MB, ekranda esa 56 px aylanada ko'rsatiladi.
// 128 px (2x retina uchun yetarli) WebP jami ~50 KB ni tashkil qiladi.
//
// Ishlatish: node tools/optimize-logos.mjs [--check]
//   --check  har bir src/*.png uchun mos .webp borligini tekshiradi (CI uchun).

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join, basename } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'logos', 'src');
const OUT = join(ROOT, 'logos');
const SIZE = 128;
const QUALITY = 0.85;

const sources = readdirSync(SRC).filter(f => f.endsWith('.png')).sort();

if (process.argv.includes('--check')) {
  const missing = sources.filter(f => !existsSync(join(OUT, basename(f, '.png') + '.webp')));
  if (missing.length) {
    console.error('WebP yo\'q: ' + missing.join(', ') + '\n`node tools/optimize-logos.mjs` ni ishlating.');
    process.exit(1);
  }
  console.log(`${sources.length} ta logotip joyida.`);
  process.exit(0);
}

// Playwright lokal yoki global o'rnatilgan bo'lishi mumkin (CommonJS resolvi NODE_PATH ni ham hisobga oladi).
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error("playwright topilmadi. `npm i -D playwright` yoki NODE_PATH ni global modullarga qarating.");
  process.exit(1);
}
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><meta charset="utf-8">');

let before = 0, after = 0;
for (const file of sources) {
  const src = join(SRC, file);
  before += statSync(src).size;
  const b64 = readFileSync(src).toString('base64');
  const out = await page.evaluate(async ({ b64, SIZE, QUALITY }) => {
    const img = new Image();
    await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = 'data:image/png;base64,' + b64; });
    const scale = Math.min(SIZE / img.width, SIZE / img.height, 1);
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', QUALITY).split(',')[1];
  }, { b64, SIZE, QUALITY });
  const bytes = Buffer.from(out, 'base64');
  writeFileSync(join(OUT, basename(file, '.png') + '.webp'), bytes);
  after += bytes.length;
}
await browser.close();

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`${sources.length} ta logotip: ${kb(before)} -> ${kb(after)} (${Math.round(100 * (1 - after / before))}% kam)`);
