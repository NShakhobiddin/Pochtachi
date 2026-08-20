#!/usr/bin/env node
// Do'kon logotiplarini bir marta yuklab, loyihaga saqlaydi: stores/<id>.webp
//
// Nima uchun: ilova 43 ta do'kon logotipini har ochilishda tashqi favicon
// xizmatlaridan olardi — bu sekin, oflaynda ishlamaydi va har bir do'kon
// domeni uchinchi tomon xizmatiga ko'rinib qoladi. Bu skript ularni bir marta
// yuklab, 128 px WebP ga o'giradi; shundan keyin ilova faqat o'z domenidan
// oladi.
//
// Ishlatish:
//   node tools/store-logos.mjs [--force]           tarmoqdan yuklab oladi
//   node tools/store-logos.mjs --from <papka>      tayyor rasmlardan oladi
//
// --from rejimi tarmoqsiz ishlaydi: papkadagi PNG/WebP fayllar do'konlarga
// moslanadi. Yonida logo_manifest.csv bo'lsa, moslash domen ustuni bo'yicha
// aniq bajariladi; bo'lmasa fayl nomidan (masalan 01_taobao.png -> taobao).
//
// --force  mavjud fayllarni ham qayta yasaydi
//
// Talab: playwright (rasm o'lchamini o'zgartirish uchun).
// Natija: stores/*.webp va stores/index.json.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'stores');
const SIZE = 128;
const QUALITY = 0.85;
const FORCE = process.argv.includes('--force');
const fromIdx = process.argv.indexOf('--from');
const FROM = fromIdx > -1 ? process.argv[fromIdx + 1] : null;

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
  return stores.map(s => ({
    id: s.id, name: s.name,
    domain: domains[s.domain] || s.domain,   // favicon xizmati uchun
    rawDomain: s.domain                      // manbadagi asl domen
  }));
}

/* Fayl nomi yoki domenni solishtirish uchun sodda kalit: faqat harf va raqam.
   "01_b_and_h_photo.png" -> "bandhphoto", "bhphotovideo.com" -> "bhphotovideo" */
const slug = v => String(v).toLowerCase()
  .replace(/\.(png|webp|jpg|jpeg|svg)$/, '')
  .replace(/^\d+[_-]/, '')
  .replace(/\.(com|net|org|uz|ru|co\.uk|cn)$/, '')
  .replace(/[^a-z0-9]/g, '');

/* Tayyor papkadan olish: har bir do'konga mos faylni topamiz. */
function localFiles(dir) {
  const files = readdirSync(dir).filter(f => /\.(png|webp|jpg|jpeg)$/i.test(f));
  const byDomain = new Map();
  const bySlug = new Map();
  for (const f of files) bySlug.set(slug(f), join(dir, f));

  // Manifest bo'lsa — domen bo'yicha aniq moslash
  for (const candidate of [join(dir, 'logo_manifest.csv'), join(dir, '..', 'logo_manifest.csv')]) {
    if (!existsSync(candidate)) continue;
    const rows = readFileSync(candidate, 'utf8').split(/\r?\n/).filter(Boolean);
    const head = rows[0].replace(/^\uFEFF/, '').split(',');
    const iFile = head.indexOf('file_name');
    const iDomain = head.indexOf('domain');
    if (iFile < 0 || iDomain < 0) continue;
    for (const row of rows.slice(1)) {
      const cols = row.split(',');
      const file = join(dir, cols[iFile]);
      if (cols[iDomain] && existsSync(file)) byDomain.set(cols[iDomain].trim().toLowerCase(), file);
    }
    break;
  }
  return { byDomain, bySlug, count: files.length };
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

const local = FROM ? localFiles(FROM) : null;
if (local) console.log(`${FROM}: ${local.count} ta fayl topildi.`);

const saved = [];
const failed = [];
for (const store of stores) {
  const file = join(OUT, `${store.id}.webp`);
  if (!FORCE && existsSync(file)) { saved.push(store.id); continue; }

  /* Tayyor papkadan: avval domen bo'yicha, keyin nom bo'yicha qidiramiz. */
  if (local) {
    const src = local.byDomain.get(String(store.rawDomain).toLowerCase())
      || local.byDomain.get(String(store.domain).toLowerCase())
      || local.bySlug.get(slug(store.id))
      || local.bySlug.get(slug(store.rawDomain))
      || local.bySlug.get(slug(store.name));
    if (!src) { failed.push(`${store.id} (${store.rawDomain})`); continue; }
    const b64 = readFileSync(src).toString('base64');
    const type = /\.webp$/i.test(src) ? 'image/webp' : /\.(jpe?g)$/i.test(src) ? 'image/jpeg' : 'image/png';
    const out = await page.evaluate(async ({ b64, type, SIZE, QUALITY }) => {
      const img = new Image();
      await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = `data:${type};base64,${b64}`; });
      const scale = Math.min(SIZE / img.width, SIZE / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', QUALITY).split(',')[1];
    }, { b64, type, SIZE, QUALITY });
    writeFileSync(file, Buffer.from(out, 'base64'));
    saved.push(store.id);
    continue;
  }

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
