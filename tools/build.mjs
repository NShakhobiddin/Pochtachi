#!/usr/bin/env node
// Dizayn manbasidan (Claude Design .dc.html) saytning kirish sahifasini yig'adi.
//
// Manba siyosati: "Xarid Yordamchisi v2.dc.html" — yagona manba, uni Claude Design
// tahrirlaydi. index.html shu fayldan generatsiya qilinadi, qo'lda tahrirlanmaydi.
//
// Ishlatish: node tools/build.mjs [--check]
//   --check  index.html manbaga mos ekanini tekshiradi (CI uchun), yozmaydi.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'Xarid Yordamchisi v2.dc.html';
const OUTPUT = 'index.html';
const BANNER = `<!-- GENERATSIYA QILINGAN: "${SOURCE}" dan. Qo'lda tahrirlamang — \`node tools/build.mjs\`. -->\n`;

function build(src) {
  // Manba fayl to'g'ridan-to'g'ri indekslanmasin: kanonik manzil — sayt ildizi.
  const canonical = '<link rel="canonical" href="./">';
  if (!src.includes('<link rel="canonical"')) {
    src = src.replace('<link rel="manifest"', canonical + '\n<link rel="manifest"');
  }
  return BANNER + src;
}

const srcPath = join(ROOT, SOURCE);
const outPath = join(ROOT, OUTPUT);
if (!existsSync(srcPath)) {
  console.error(`Manba topilmadi: ${SOURCE}`);
  process.exit(1);
}
const built = build(readFileSync(srcPath, 'utf8'));

if (process.argv.includes('--check')) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== built) {
    console.error(`${OUTPUT} manbaga mos emas. \`node tools/build.mjs\` ni ishlating.`);
    process.exit(1);
  }
  console.log(`${OUTPUT} manbaga mos.`);
} else {
  writeFileSync(outPath, built);
  console.log(`${OUTPUT} yozildi (${(built.length / 1024).toFixed(0)} KB).`);
}
