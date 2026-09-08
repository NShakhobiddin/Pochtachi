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
  /* Do'kon logotiplari ro'yxati manbaga kiritiladi: ilgari ilova ochilgach
     stores/index.json alohida so'ralardi va logotiplar shundan keyin
     chizilardi — birinchi chizilishda monogramma, keyin rasm "sakrardi".
     Manbada ro'yxat bo'sh turadi (dizayn ko'rinishida hech nima o'zgarmaydi),
     to'ldirilgan nusxa faqat index.html ga tushadi. */
  const idx = join(ROOT, 'stores', 'index.json');
  if (existsSync(idx)) {
    const ids = JSON.parse(readFileSync(idx, 'utf8'));
    const list = Array.isArray(ids) ? ids : (ids && ids.ids) || [];
    const marker = 'const STORE_LOGO_IDS = [];';
    if (!src.includes(marker)) throw new Error('Manbada STORE_LOGO_IDS belgisi topilmadi');
    src = src.replace(marker, 'const STORE_LOGO_IDS = ' + JSON.stringify(list) + ';');
  }
  return BANNER + src;
}


// ---- service worker ------------------------------------------------------
// Offline uchun keshlanadigan qobiq ro'yxati va uning versiyasi manbadan
// hisoblanadi, shuning uchun har o'zgarishda kesh o'zi yangilanadi.
/* Ikki to'plam: `shell` — o'rnatishda darhol (ilova ochilishi va bosh
   sahifa uchun kerak bo'lgani: HTML, skriptlar, shriftlar, brend va to'rt
   kartochka ikonkasi), `later` — sahifa tinchigach ('warm' xabari) ikki
   oqimda (qolgan ikonkalar, logotiplar, bayroqlar, do'kon logotiplari,
   taqiq va me'yor belgilari, qo'llanma dvigateli). Ilgari 161 fayl bir
   yo'la yuklanardi va foydalanuvchi ochgan ekranning ikonkalari bilan
   tarmoqni talashardi. */
const SHELL_ICONS = ['icons/brand.webp', 'icons/brand-full.webp', 'icons/stores-3d.webp', 'icons/courier-3d.webp',
  'icons/customs-3d.webp', 'icons/guides-3d.webp', 'icons/mutaxassis-3d.webp', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
function precacheList() {
  const files = ['./', 'support.js', 'manifest.webmanifest', 'data/norms.json',
    'vendor/react.production.min.js', 'vendor/react-dom.production.min.js'];
  const later = ['guides/guide-base.css', 'guides/guide-common.css', 'guides/guide-engine.js', 'guides/guide-motion.js', 'guides/guide.js'];
  /* Shriftlar o'z domenimizda turadi, shuning uchun ular ham qobiq bilan
     birga keshlanadi — ikkinchi ochilishda umuman tarmoq kerak emas. */
  for (const f of readdirSync(join(ROOT, 'fonts')).sort()) {
    if (/\.(woff2|css)$/.test(f)) files.push(`fonts/${f}`);
  }
  /* stores/index.json keshlanmaydi: ro'yxat index.html ichida, faylning
     o'zi faqat dizayn ko'rinishidagi zaxira yo'l uchun. */
  /* Ichki papkalar ham kerak: taqiq va me'yor belgilari icons/ban va
     icons/norm ichida turadi. icons/src va icons/glyphs — ikonka tayyorlash
     uchun manba (1.1 MB), ishga tushmaydi. */
  const SRC_DIRS = new Set(['src', 'glyphs']);
  const walkIcons = dir => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      if (e.isDirectory()) { if (!SRC_DIRS.has(e.name)) walkIcons(`${dir}/${e.name}`); continue; }
      if (!/\.(webp|png)$/.test(e.name) || e.name === 'og-cover.png') continue;
      const path = `${dir}/${e.name}`;
      (SHELL_ICONS.includes(path) ? files : later).push(path);
    }
  };
  for (const dir of ['icons', 'logos', 'stores', 'flags']) walkIcons(dir);
  for (const p of SHELL_ICONS) if (!files.includes(p)) throw new Error('Qobiq ikonkasi topilmadi: ' + p);
  /* Isitish tartibi — foydalanuvchi ikkinchi ochilishda avval qayerga
     borishi ehtimoli bo'yicha: intro (har ochilishda), do'kon papkalari
     ikonkalari, do'kon logotiplari, kuryer logotiplari va bayroqlar, keyin
     bojxona va xizmat ikonkalari, taqiq/me'yor belgilari, qo'llanma
     dvigateli. Isitish sekin tarmoqda o'n soniyalab davom etadi va
     foydalanuvchi shu orada ilovani yopib qo'yishi mumkin. */
  const rank = f =>
    f.startsWith('icons/intro/') ? 0 : f.startsWith('icons/dok-') ? 1 : f.startsWith('stores/') ? 2 :
    f.startsWith('logos/') ? 3 : f.startsWith('flags/') ? 4 : f.startsWith('icons/boj-') ? 5 :
    f.startsWith('icons/svc-') ? 6 : f.startsWith('icons/ban/') ? 7 : f.startsWith('icons/norm/') ? 8 : 9;
  later.sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1));
  return { shell: files, later };
}

function buildServiceWorker(indexHtml) {
  const { shell, later } = precacheList();
  const files = [...shell, ...later];
  /* Ro'yxat qo'lda yozilgan qoidalarga tayanadi, shuning uchun teskari
     tomondan ham tekshiramiz: sahifa murojaat qilgan ikonka keshda
     bo'lmasa, oflaynda u bo'sh chiqadi va buni hech kim sezmaydi. */
  const runtime = indexHtml.replace(/<meta\b[^>]*>/gi, '');   // OG rasmi ilovada emas, ulashishda ishlatiladi
  const used = new Set([...runtime.matchAll(/(?:icons|logos|stores|flags)\/[\w./-]+\.(?:webp|png)/g)].map(m => m[0]));
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
    .replace('__PRECACHE__', JSON.stringify(shell, null, 2))
    .replace('__LATER__', JSON.stringify(later, null, 2));
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
