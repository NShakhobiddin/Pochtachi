#!/usr/bin/env node
// Do'kon logotiplarini bir marta yuklab, loyihaga saqlaydi: stores/<id>.webp
//
// Nima uchun: ilova 43 ta do'kon logotipini har ochilishda tashqi favicon
// xizmatlaridan olardi — bu sekin, oflaynda ishlamaydi va har bir do'kon
// domeni uchinchi tomon xizmatiga ko'rinib qoladi. Bu skript ularni bir marta
// yuklab, 128 px WebP ga o'giradi; shundan keyin ilova faqat o'z domenidan
// oladi.
//
// Ishlatish: node tools/store-logos.mjs [--force]
//   --force  mavjud fayllarni ham qayta yuklaydi
//
// Talab: internet va playwright. Natija: stores/*.webp va stores/index.json.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'stores');
const SIZE = 128;
const QUALITY = 0.85;
const FORCE = process.argv.includes('--force');

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error("playwright topilmadi. `npm i -D playwright` ni ishlating.");
  process.exit(1);
}

// Ilovadagi do'konlar ro'yxatini manbadan o'qiymiz, ikki joyda saqlamaslik uchun.
function readStores() {
  const src = readFileSync(join(ROOT, 'Xarid Yordamchisi v2.dc.html'), 'utf8');
  const start = src.indexOf('const STORES = [');
  const end = src.indexOf('\n];', start);
  if (start < 0 || end < 0) throw new Error('STORES ro\'yxati topilmadi');
  const stores = eval(src.slice(start + 'const STORES = '.length, end + 2));
  const mapStart = src.indexOf('const LOGO_DOMAIN = {');
  const mapEnd = src.indexOf('};', mapStart);
  const domains = eval('(' + src.slice(mapStart + 'const LOGO_DOMAIN = '.length, mapEnd + 1) + ')');
  return stores.map(s => ({ id: s.id, name: s.name, domain: domains[s.domain] || s.domain }));
}

const sources = domain => [
  `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
  `https://unavatar.io/${domain}?fallback=false`,
  `https://icons.duckduckgo.com/ip3/${domain}.ico`
];

mkdirSync(OUT, { recursive: true });
const stores = readStores();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><meta charset="utf-8">');

const saved = [];
const failed = [];
for (const store of stores) {
  const file = join(OUT, `${store.id}.webp`);
  if (!FORCE && existsSync(file)) { saved.push(store.id); continue; }

  let done = false;
  for (const url of sources(store.domain)) {
    const out = await page.evaluate(async ({ url, SIZE, QUALITY }) => {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return null;
        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob);
        // Juda kichik (16 px) yoki bo'sh rasmlarni olmaymiz — ular monogrammadan yomonroq.
        if (bitmap.width < 32) return null;
        const scale = Math.min(SIZE / bitmap.width, SIZE / bitmap.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/webp', QUALITY).split(',')[1];
      } catch (e) {
        return null;
      }
    }, { url, SIZE, QUALITY });
    if (out) {
      writeFileSync(file, Buffer.from(out, 'base64'));
      saved.push(store.id);
      done = true;
      break;
    }
  }
  if (!done) failed.push(`${store.id} (${store.domain})`);
}
await browser.close();

// index.json — ilova shu ro'yxatga qarab lokal faylni ishlatadi.
const present = readdirSync(OUT).filter(f => f.endsWith('.webp')).map(f => f.replace(/\.webp$/, '')).sort();
writeFileSync(join(OUT, 'index.json'), JSON.stringify(present, null, 0) + '\n');

const totalKb = present.reduce((n, id) => n + readFileSync(join(OUT, `${id}.webp`)).length, 0) / 1024;
console.log(`${present.length} ta logotip saqlandi (${totalKb.toFixed(0)} KB).`);
if (failed.length) {
  console.log(`Topilmadi (monogramma ko'rinadi): ${failed.join(', ')}`);
}
console.log('Endi `node tools/build.mjs` ni ishlating — service worker ro\'yxati yangilanadi.');
