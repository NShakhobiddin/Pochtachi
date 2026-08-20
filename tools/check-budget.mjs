#!/usr/bin/env node
// Sayt og'irlashib ketmasligini tekshiradi.
//
// Tarix: logotiplar bir vaqtlar 1,6 MB ni, bayroq shrifti 693 KB ni tashkil
// qilardi. Byudjet shunday holat qaytib kelmasligi uchun.
//
// Ishlatish: node tools/check-budget.mjs

import { readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const BUDGETS = [
  { name: 'logotiplar (logos/*.webp)', dir: 'logos', ext: ['.webp'], maxTotalKb: 150, maxFileKb: 20 },
  { name: 'ikonkalar (icons/*.webp)', dir: 'icons', ext: ['.webp'], maxTotalKb: 120, maxFileKb: 25 },
  { name: 'shriftlar (fonts/)', dir: 'fonts', ext: ['.woff2'], maxTotalKb: 80, maxFileKb: 80 },
  { name: 'qo\'llanmalar (guides/inline/)', dir: 'guides/inline', ext: ['.html'], maxTotalKb: 470, maxFileKb: 90 }
];

const kb = bytes => Math.round(bytes / 1024);
let failed = false;

for (const b of BUDGETS) {
  const dir = join(ROOT, b.dir);
  if (!existsSync(dir)) { console.error(` XATO  ${b.name}: papka yo'q`); failed = true; continue; }
  const files = readdirSync(dir).filter(f => b.ext.includes(extname(f)));
  let total = 0;
  const oversize = [];
  for (const f of files) {
    const size = statSync(join(dir, f)).size;
    total += size;
    if (kb(size) > b.maxFileKb) oversize.push(`${f} ${kb(size)} KB`);
  }
  const totalOk = kb(total) <= b.maxTotalKb;
  const ok = totalOk && oversize.length === 0;
  console.log(`${ok ? '  ok  ' : ' XATO '} ${b.name}: ${files.length} ta fayl, ${kb(total)} KB (chegara ${b.maxTotalKb} KB)`);
  if (oversize.length) console.log(`        chegaradan katta fayllar: ${oversize.join(', ')}`);
  if (!ok) failed = true;
}

// Asosiy sahifa: gzip'siz hajm (GitHub Pages gzip beradi, lekin manba ham o'smasin)
const index = join(ROOT, 'index.html');
if (existsSync(index)) {
  const size = kb(statSync(index).size);
  const ok = size <= 420;
  console.log(`${ok ? '  ok  ' : ' XATO '} index.html: ${size} KB (chegara 420 KB)`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\nO\'lcham byudjeti buzildi. Rasm/shriftlarni qayta siqing yoki chegarani ongli ravishda oshiring.');
  process.exit(1);
}
console.log('\nO\'lcham byudjeti joyida.');
