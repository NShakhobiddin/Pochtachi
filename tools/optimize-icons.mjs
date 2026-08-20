#!/usr/bin/env node
// Bo'lim va tab ikonkalarini ekrandagi o'lchamiga moslaydi: icons/src/*.webp -> icons/*.webp
//
// Nima uchun: ikonkalar dizayn faylidan kelgan holicha edi — tab ikonkasi
// 96 px saqlanib, ekranda 23 px chizilardi. Endi har bir ikonka ekrandagi
// o'lchamiga qarab, 3x zichlikdagi ekran uchun yetarli darajada saqlanadi.
//
// Asl nusxalar icons/src/ da qoladi, shuning uchun skriptni qayta ishga
// tushirish sifatni pasaytirmaydi.
//
// Ishlatish: node tools/optimize-icons.mjs [--check]

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'icons', 'src');
const OUT = join(ROOT, 'icons');
const QUALITY = 0.88;

/* Ekrandagi o'lcham x3 (eng zich ekranlar uchun ham yetarli).
   Bo'lim ikonkalari 64 px chiziladi, ya'ni 192 px kerak bo'lardi — asl
   nusxalar 180 px, shuning uchun ular kichraytirilmaydi. */
const target = name => name.startsWith('tab-') ? 72 : 180;

const sources = readdirSync(SRC).filter(f => f.endsWith('.webp')).sort();

if (process.argv.includes('--check')) {
  const missing = sources.filter(f => !existsSync(join(OUT, f)));
  if (missing.length) {
    console.error('Ikonka yo\'q: ' + missing.join(', ') + '\n`node tools/optimize-icons.mjs` ni ishlating.');
    process.exit(1);
  }
  console.log(`${sources.length} ta ikonka joyida.`);
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
  const size = target(file);
  const out = await page.evaluate(async ({ b64, size, QUALITY }) => {
    const img = new Image();
    await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = 'data:image/webp;base64,' + b64; });
    const scale = Math.min(size / img.width, size / img.height, 1);
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', QUALITY).split(',')[1];
  }, { b64, size, QUALITY });
  const body = Buffer.from(out, 'base64');
  writeFileSync(join(OUT, file), body);
  after += body.length;
  console.log(`  ${file.padEnd(24)} ${(statSync(src).size / 1024).toFixed(1)} KB -> ${(body.length / 1024).toFixed(1)} KB  (${size} px)`);
}
await browser.close();
console.log(`\n${sources.length} ta ikonka: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB.`);
