#!/usr/bin/env node
// Qo'lda yozilgan SVG ikonkalarni manba WebP ga chizadi:
//   icons/src/*.svg -> icons/src/*.webp
//
// Nima uchun alohida qadam: qolgan 3D ikonkalar dizayn faylidan tayyor rasm
// bo'lib keladi, bu esa kodda yozilgan. SVG ni manba sifatida saqlab, undan
// rasm yasash — keyin rangi yoki shakli o'zgarsa qayta chizish uchun.
// Chizishdan keyin `npm run icons` ni ishga tushiring: u manba WebP ni
// ekrandagi o'lchamiga (x3) keltirib icons/ ga chiqaradi.
//
// Ishlatish: node tools/svg-icon.mjs [--check]
//   --check  har bir src/*.svg uchun mos .webp borligini tekshiradi (CI uchun).

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join, basename } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'icons', 'src');
const SIZE = 512;      // manba o'lchami; optimize-icons.mjs uni kichraytiradi
const QUALITY = 0.95;

const sources = readdirSync(SRC).filter(f => f.endsWith('.svg')).sort();

if (process.argv.includes('--check')) {
  const missing = sources.filter(f => !existsSync(join(SRC, basename(f, '.svg') + '.webp')));
  if (missing.length) {
    console.error('Manba WebP yo\'q: ' + missing.join(', ') + '\n`node tools/svg-icon.mjs` ni ishlating.');
    process.exit(1);
  }
  console.log(`${sources.length} ta SVG ikonka joyida.`);
  process.exit(0);
}

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error("playwright topilmadi. `npm i -D playwright` yoki NODE_PATH ni global modullarga qarating.");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: SIZE / 256 });

for (const file of sources) {
  const svg = readFileSync(join(SRC, file), 'utf8');
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
  const png = await page.screenshot({ omitBackground: true });
  const webp = await page.evaluate(async ({ b64, SIZE, QUALITY }) => {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, SIZE, SIZE);
    return c.toDataURL('image/webp', QUALITY).split(',')[1];
  }, { b64: png.toString('base64'), SIZE, QUALITY });
  const out = join(SRC, basename(file, '.svg') + '.webp');
  writeFileSync(out, Buffer.from(webp, 'base64'));
  console.log(`${file} -> ${basename(out)} (${SIZE} px)`);
}

await browser.close();
