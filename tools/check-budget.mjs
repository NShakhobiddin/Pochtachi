#!/usr/bin/env node
// Sayt og'irlashib ketmasligini tekshiradi.
//
// Tarix: logotiplar bir vaqtlar 1,6 MB ni, bayroq shrifti 693 KB ni tashkil
// qilardi. Byudjet shunday holat qaytib kelmasligi uchun.
//
// Ishlatish: node tools/check-budget.mjs

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const BUDGETS = [
  { name: 'logotiplar (logos/*.webp)', dir: 'logos', ext: ['.webp'], maxTotalKb: 150, maxFileKb: 20 },
  /* icons/ endi besh xil vazifani bajaradi: bo'lim kartochkalari (3D),
     bojxona qatorlari, do'kon papkalari, qo'llanmalardagi ilova tugmalari
     va xizmat kartochkalari. Hammasi ekran ochilganda yuklanadi va service
     worker keshiga tushadi; do'kon logotiplari (178 KB) bilan bir darajada. */
  { name: 'ikonkalar (icons/*.webp)', dir: 'icons', ext: ['.webp'], maxTotalKb: 200, maxFileKb: 25 },
  /* Taqiqlangan tovarlar ro'yxati uchun 22 ta belgi. Faqat o'sha bo'lim
     ochilganda yuklanadi, shuning uchun alohida hisoblanadi. */
  /* Intro logotipining bo'laklari: 11 ta fayl, faqat birinchi ochilishda
     kerak, lekin service worker keshiga tushadi. */
  { name: 'intro bo\'laklari (icons/intro/*.webp)', dir: 'icons/intro', ext: ['.webp'], maxTotalKb: 90, maxFileKb: 30 },
  { name: 'taqiq belgilari (icons/ban/*.webp)', dir: 'icons/ban', ext: ['.webp'], maxTotalKb: 70, maxFileKb: 8 },
  /* Bojxona me'yorlari bo'limi uchun 5 ta belgi. */
  { name: 'me\'yor belgilari (icons/norm/*.webp)', dir: 'icons/norm', ext: ['.webp'], maxTotalKb: 40, maxFileKb: 8 },
  /* Bitta matn shrifti (Onest, o'zgaruvchan) + bayroq subseti. Brauzer
     sahifadagi belgilarga qarab faqat keraklisini oladi: odatda lotin
     (32 KB), kirillcha matn bo'lsa yana 14 KB, bayroq ko'rinsa 44 KB. */
  { name: 'shriftlar (fonts/)', dir: 'fonts', ext: ['.woff2'], maxTotalKb: 120, maxFileKb: 50 },
  /* Do'kon logotiplari: 43 ta do'kon, har biri 128 px WebP. Do'konlar
     ekrani ochilgandagina yuklanadi. */
  { name: 'do\'kon logotiplari (stores/*.webp)', dir: 'stores', ext: ['.webp'], maxTotalKb: 260, maxFileKb: 20 },
  /* Qo'llanmalar. Har birida qadamlar ichida 4-6 ta telefon maketi bor —
     ular SVG bo'lgani uchun manbada joy oladi, lekin juda yaxshi siqiladi.
     Foydalanuvchi bir vaqtda bitta qo'llanmani ochadi, shuning uchun
     haqiqiy chegara — bitta faylning gzip hajmi. */
  { name: 'qo\'llanmalar (guides/inline/)', dir: 'guides/inline', ext: ['.html'],
    maxTotalKb: 660, maxFileKb: 95, gzipMaxFileKb: 30 }
];

const kb = bytes => Math.round(bytes / 1024);
let failed = false;

for (const b of BUDGETS) {
  const dir = join(ROOT, b.dir);
  if (!existsSync(dir)) { console.error(` XATO  ${b.name}: papka yo'q`); failed = true; continue; }
  const files = readdirSync(dir).filter(f => b.ext.includes(extname(f)));
  let total = 0, totalGz = 0;
  const oversize = [];
  for (const f of files) {
    const path = join(dir, f);
    const size = statSync(path).size;
    total += size;
    if (kb(size) > b.maxFileKb) oversize.push(`${f} ${kb(size)} KB`);
    if (b.gzipMaxFileKb) {
      const gz = gzipSync(readFileSync(path), { level: 9 }).length;
      totalGz += gz;
      if (kb(gz) > b.gzipMaxFileKb) oversize.push(`${f} gzip ${kb(gz)} KB`);
    }
  }
  const totalOk = kb(total) <= b.maxTotalKb;
  const ok = totalOk && oversize.length === 0;
  const gzInfo = b.gzipMaxFileKb ? `, gzip ${kb(totalGz)} KB (bittasi <= ${b.gzipMaxFileKb} KB)` : '';
  console.log(`${ok ? '  ok  ' : ' XATO '} ${b.name}: ${files.length} ta fayl, ${kb(total)} KB (chegara ${b.maxTotalKb} KB)${gzInfo}`);
  if (oversize.length) console.log(`        chegaradan katta fayllar: ${oversize.join(', ')}`);
  if (!ok) failed = true;
}

// Asosiy sahifa: gzip'siz hajm (GitHub Pages gzip beradi, lekin manba ham
// o'smasin). Chegara 420 -> 450 -> 470 -> 480 -> 520 KB: birinchisi bo'limlarga
// qo'shilgan ohang va katta kartochkalar uchun, ikkinchisi rus tili lug'ati
// to'ldirilgani uchun (butun qo'llanmalar ekrani tarjimasiz qolgan edi),
// uchinchisi brend introsining ~7 KB lik dvigateli uchun, to'rtinchisi
// 43 do'konning xususiyat qatorlari va pullik xizmatlar ekranining
// tarjimasi uchun (u ochilgunicha butunlay tarjimasiz edi).
// Foydalanuvchiga yetadigan hajm gzipdan keyingisi, shuning uchun u ham
// chiqariladi: qaror shu raqamga qarab qabul qilinsin.
const index = join(ROOT, 'index.html');
if (existsSync(index)) {
  const size = kb(statSync(index).size);
  const gz = kb(gzipSync(readFileSync(index), { level: 9 }).length);
  const ok = size <= 520;
  console.log(`${ok ? '  ok  ' : ' XATO '} index.html: ${size} KB (chegara 520 KB), gzip ${gz} KB`);
  if (!ok) failed = true;
}

/* Oflayn kesh: taqiq va me'yor belgilari ichki papkalarda turadi va
   ilgari precacheList ularni aylanmagani uchun oflaynda bo'sh chiqardi. */
const sw = join(ROOT, 'sw.js');
if (existsSync(sw)) {
  const txt = readFileSync(sw, 'utf8');
  const need = [['icons/ban/', 22], ['icons/norm/', 5]];
  for (const [dir, n] of need) {
    const have = (txt.match(new RegExp(dir.replace('/', '\\/'), 'g')) || []).length;
    const ok = have >= n;
    console.log(`${ok ? '  ok  ' : ' XATO '} oflayn kesh ${dir}: ${have} ta (kamida ${n})`);
    if (!ok) failed = true;
  }
  /* Manba papkalari keshga tushmasin: 1.1 MB behuda yuklama. */
  const src = /icons\/(?:src|glyphs)\//.test(txt);
  console.log(`${src ? ' XATO ' : '  ok  '} manba papkalari keshda emas`);
  if (src) failed = true;
}

if (failed) {
  console.error('\nO\'lcham byudjeti buzildi. Rasm/shriftlarni qayta siqing yoki chegarani ongli ravishda oshiring.');
  process.exit(1);
}
console.log('\nO\'lcham byudjeti joyida.');
