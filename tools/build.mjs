#!/usr/bin/env node
// Dizayn manbasidan (Claude Design .dc.html) saytning kirish sahifasini yig'adi.
//
// Manba siyosati: "Xarid Yordamchisi v2.dc.html" — yagona manba, uni Claude Design
// tahrirlaydi. index.html shu fayldan generatsiya qilinadi, qo'lda tahrirlanmaydi.
//
// Ishlatish: node tools/build.mjs [--check]
//   --check  index.html manbaga mos ekanini tekshiradi (CI uchun), yozmaydi.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
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


// ---- service worker ------------------------------------------------------
// Offline uchun keshlanadigan qobiq ro'yxati va uning versiyasi manbadan
// hisoblanadi, shuning uchun har o'zgarishda kesh o'zi yangilanadi.
function precacheList() {
  const files = ['./', 'support.js', 'manifest.webmanifest', 'data/norms.json',
    'vendor/react.production.min.js', 'vendor/react-dom.production.min.js',
    'guides/guide-base.css', 'guides/guide-common.css', 'guides/guide-engine.js', 'guides/guide.js'];
  /* Shriftlar o'z domenimizda turadi, shuning uchun ular ham qobiq bilan
     birga keshlanadi — ikkinchi ochilishda umuman tarmoq kerak emas. */
  for (const f of readdirSync(join(ROOT, 'fonts')).sort()) {
    if (/\.(woff2|css)$/.test(f)) files.push(`fonts/${f}`);
  }
  // Do'kon logotiplari saqlangan bo'lsa, ular ham qobiq bilan birga keshlanadi.
  if (existsSync(join(ROOT, 'stores', 'index.json'))) files.push('stores/index.json');
  /* Ichki papkalar ham kerak: taqiq va me'yor belgilari icons/ban va
     icons/norm ichida turadi. Ilgari sikl faqat birinchi darajani
     aylanardi va oflaynda o'sha 27 ta belgi bo'sh chiqardi.
     icons/src va icons/glyphs — ikonka tayyorlash uchun manba (1.1 MB),
     ishga tushmaydi: ularni keshlash oflayn yuklamani behuda oshiradi. */
  const SRC_DIRS = new Set(['src', 'glyphs']);
  const walkIcons = dir => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      if (e.isDirectory()) { if (!SRC_DIRS.has(e.name)) walkIcons(`${dir}/${e.name}`); continue; }
      if (/\.(webp|png)$/.test(e.name) && e.name !== 'og-cover.png') files.push(`${dir}/${e.name}`);
    }
  };
  for (const dir of ['icons', 'logos', 'stores']) walkIcons(dir);
  return files;
}

function buildServiceWorker(indexHtml) {
  const files = precacheList();
  /* Ro'yxat qo'lda yozilgan qoidalarga tayanadi, shuning uchun teskari
     tomondan ham tekshiramiz: sahifa murojaat qilgan ikonka keshda
     bo'lmasa, oflaynda u bo'sh chiqadi va buni hech kim sezmaydi. */
  const runtime = indexHtml.replace(/<meta\b[^>]*>/gi, '');   // OG rasmi ilovada emas, ulashishda ishlatiladi
  const used = new Set([...runtime.matchAll(/(?:icons|logos|stores)\/[\w./-]+\.(?:webp|png)/g)].map(m => m[0]));
  const missing = [...used].filter(u => !files.includes(u));
  if (missing.length) {
    console.error('Keshga tushmagan ikonkalar:', missing.join(', '));
    process.exitCode = 1;
  }
  const hash = createHash('sha256');
  hash.update(indexHtml);
  for (const f of files) {
    if (f === './') continue;
    hash.update(readFileSync(join(ROOT, f)));
  }
  const version = hash.digest('hex').slice(0, 12);
  return readFileSync(join(ROOT, 'tools', 'sw.template.js'), 'utf8')
    .replace('__VERSION__', version)
    .replace('__PRECACHE__', JSON.stringify(files, null, 2));
}

const srcPath = join(ROOT, SOURCE);
const outPath = join(ROOT, OUTPUT);
if (!existsSync(srcPath)) {
  console.error(`Manba topilmadi: ${SOURCE}`);
  process.exit(1);
}
const built = build(readFileSync(srcPath, 'utf8'));
const sw = buildServiceWorker(built);

if (process.argv.includes('--check')) {
  const currentSw = existsSync(join(ROOT, 'sw.js')) ? readFileSync(join(ROOT, 'sw.js'), 'utf8') : '';
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== built || currentSw !== sw) {
    console.error(`${OUTPUT} manbaga mos emas. \`node tools/build.mjs\` ni ishlating.`);
    process.exit(1);
  }
  console.log(`${OUTPUT} manbaga mos.`);
} else {
  writeFileSync(outPath, built);
  writeFileSync(join(ROOT, 'sw.js'), sw);
  console.log(`${OUTPUT} yozildi (${(built.length / 1024).toFixed(0)} KB), sw.js yangilandi.`);
}
