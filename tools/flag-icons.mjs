#!/usr/bin/env node
// Kuryerlar bo'limining bosh oynasidagi 3D bayroqlarni tayyorlaydi:
//   flags/src/*.png -> flags/*.webp
//
// Faqat o'sha bitta ekran uchun. Ilovaning qolgan joylarida bayroqlar
// emoji bo'lib qoladi (fonts/flags.woff2 subseti) — ular kuryer
// kartochkalarida, tarif jadvallarida va sehrgarda o'nlab marta
// takrorlanadi, rasm bilan chizsak har biri alohida so'rov bo'lardi.
//
// Asl fayllar bir xil 1448x1086 ramkada, bayroq ramka ichida bir joyda
// turadi — shuning uchun ular kesilmaydi, faqat kichraytiriladi. Kesib
// olinsa har birining soyasi boshqacha bo'lib, ekranda o'lchamlari bir
// xil chiqmasdi.
//
// 192x144 px: ekranda eng katta 64x48 chiziladi (eng ko'p kuryerli
// yo'nalishning katta kartochkasida), ya'ni 3x zichlik uchun yetarli.
//
// Ishlatish: node tools/flag-icons.mjs [--check]
//   --check  har bir src/*.png uchun mos .webp borligini tekshiradi (CI uchun).

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join, basename } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'flags', 'src');
const OUT = join(ROOT, 'flags');
const WIDTH = 192;
const QUALITY = 0.86;

const sources = readdirSync(SRC).filter(f => f.endsWith('.png')).sort();

if (process.argv.includes('--check')) {
  const missing = sources.filter(f => !existsSync(join(OUT, basename(f, '.png') + '.webp')));
  if (missing.length) {
    console.error('WebP yo\'q: ' + missing.join(', ') + '\n`node tools/flag-icons.mjs` ni ishlating.');
    process.exit(1);
  }
  console.log(`${sources.length} ta bayroq joyida.`);
  process.exit(0);
}

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error("playwright topilmadi. `npm i -D playwright` ni ishlating.");
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
  const out = await page.evaluate(async ({ b64, WIDTH, QUALITY }) => {
    const img = new Image();
    await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = 'data:image/png;base64,' + b64; });
    const scale = Math.min(WIDTH / img.width, 1);
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', QUALITY).split(',')[1];
  }, { b64, WIDTH, QUALITY });
  const bytes = Buffer.from(out, 'base64');
  writeFileSync(join(OUT, basename(file, '.png') + '.webp'), bytes);
  after += bytes.length;
}
await browser.close();

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`${sources.length} ta bayroq: ${kb(before)} -> ${kb(after)}`);
