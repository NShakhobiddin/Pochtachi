#!/usr/bin/env node
// Qadamlar ichidagi telefon maketlarini bir me'yorga keltiradi.
//
// Maketlar dizayn faylidan eksport qilinadi va har safar kichik farqlar bilan
// keladi: bir belgi kartochka chetiga markazlangan, boshqasi ichkarida; ekran
// foni kvadrat burchakli bo'lib ramkadan chiqib turadi; pastda ba'zan 100 px
// bo'sh joy qoladi. Shu skript hammasini bir qoidaga soladi:
//
//   1. Ortiqcha SVG atributlari olib tashlanadi (font-family — matn CSS orqali
//      ilovaning shriftini oladi; opacity="1", text-anchor="start",
//      stroke-width="1", rx="0" — standart qiymatlar), uzun kasrlar
//      ikki xonagacha yaxlitlanadi.
//   2. Raqamli belgilar kartochka chetiga markazlanadi: o'ngda 288, chapda 12.
//      (Kartochkalar 12..288 orasida, qiymat matnlari 276 da tugaydi —
//      shuning uchun belgi hech qachon matnni to'smaydi.)
//   3. Belgilar yuqoridan pastga qarab 1, 2, 3... bo'lib o'sadi; izohlar
//      ro'yxati ham shu tartibga keltiriladi.
//   4. Ekran foni — tepasi to'g'ri (rangli sarlavha tasmasi ham to'g'ri
//      turishi uchun), pasti dumaloq shakl. U oq ichki to'rtburchakdan har
//      tomondan 3 px ichkarida turadi va burchak radiusi u bilan bir
//      markazli (20 - 3 = 17). Oxirgi elementdan keyin 26 px bo'shliq
//      qoladi, ramka balandligi shundan kelib chiqadi.
//
// Ishlatish: node tools/normalize-mockups.mjs [--check]

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'guides', 'inline');
const CHECK = process.argv.includes('--check');

const GAP = 26;      // oxirgi elementdan ekran tubigacha
const BEZEL = 3;     // ekran foni va oq ichki to'rtburchak orasidagi chekka
const R_OUT = 20;    // oq ichki to'rtburchak radiusi
const R_IN = R_OUT - BEZEL;
const TOP = 19;      // ekran foni <g transform="translate(9,19)"> ichida

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error("playwright topilmadi. `npm i -D playwright` ni ishlating.");
  process.exit(1);
}

/* 1. Ortiqcha atributlar va uzun kasrlar. */
const tozala = svg => svg
  .replace(/ font-family="[^"]*"/g, '')
  .replace(/ opacity="1"/g, '')
  .replace(/ text-anchor="start"/g, '')
  .replace(/ stroke-width="1"(?=[ />])/g, '')
  .replace(/ rx="0"(?=[ />])/g, '')
  .replace(/(\d+\.\d{3,})/g, m => String(Math.round(parseFloat(m) * 100) / 100))
  .replace(/(\d)\.0(?=["\s])/g, '$1');

/* 2. Belgilar kartochka chetiga. */
const BELGI = /<circle cx="([\d.]+)" cy="([\d.]+)" r="11\.5"([^>]*)\/><circle cx="[\d.]+" cy="[\d.]+" r="10"([^>]*)\/><text x="[\d.]+" y="([\d.]+)"([^>]*)>(\d)<\/text>/g;
const chetga = svg => svg.replace(BELGI, (m, cx, cy, a1, a2, ty, a3, n) => {
  const x = +cx >= 150 ? 288 : 12;
  return `<circle cx="${x}" cy="${cy}" r="11.5"${a1}/><circle cx="${x}" cy="${cy}" r="10"${a2}/>`
       + `<text x="${x}" y="${ty}"${a3}>${n}</text>`;
});

/* 3. Belgilar tartibi + izohlar ro'yxati. */
const IZOH = /<li><b class="n">(\d)<\/b>([\s\S]*?)<\/li>/g;
function tartibla(figura) {
  const bs = [...figura.matchAll(BELGI)].map(m => ({ cy: +m[2], n: +m[7] }));
  if (bs.length < 2) return figura;
  const kutilgan = [...bs].sort((a, b) => a.cy - b.cy).map(b => b.n);
  const tugri = [...bs].map(b => b.n).sort((a, b) => a - b);
  if (kutilgan.every((n, i) => n === tugri[i])) return figura;

  const xarita = new Map();
  [...bs].sort((a, b) => a.cy - b.cy).forEach((b, i) => xarita.set(b.n, i + 1));
  let out = figura.replace(BELGI, (m, cx, cy, a1, a2, ty, a3, n) =>
    m.replace(new RegExp('>' + n + '</text>$'), '>' + xarita.get(+n) + '</text>'));

  const lis = [...out.matchAll(IZOH)];
  if (lis.length === bs.length) {
    const tana = new Map(lis.map(m => [+m[1], m[2]]));
    const qayta = [...xarita.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([eski, yangi]) => `<li><b class="n">${yangi}</b>${tana.get(eski)}</li>`)
      .join('');
    out = out.slice(0, lis[0].index) + qayta + out.slice(lis[lis.length - 1].index + lis[lis.length - 1][0].length);
  }
  return out;
}

/* 4. Ramka geometriyasi — SVG ni brauzerda o'lchab hisoblanadi. */
async function ramka(page, svg) {
  const vb = svg.match(/viewBox="0 0 318 (\d+)"/);
  if (!vb) return svg;
  const H0 = +vb[1];
  const path = svg.match(/<path d="M0 0H300V(\d+) a17 17 0 0 1 -17 17H17a17 17 0 0 1 -17 -17Z"([^>]*)\/>/);
  /* Foni hali to'rtburchak bo'lsa: uni balandligi bo'yicha tanlaymiz, aks
     holda regexp ekran ichidagi 34 px li sarlavha tasmasiga tushib qoladi. */
  const rect = path ? null
    : svg.match(new RegExp('<rect x="0" y="0" width="300" height="' + (H0 - 24) + '"([^>]*)/>'));
  if (!path && !rect) return svg;
  const atr = (path ? path[2] : rect[1]).replace(/ opacity="1"/, '');
  const eski = path ? path[0] : rect[0];

  await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0">' + svg);
  const C = await page.evaluate(() => {
    const g = document.querySelector('g[transform]');
    let bottom = 0;
    for (const el of g.children) {
      const d = el.getAttribute('d') || '';
      const fon = (el.tagName === 'rect' && el.getAttribute('x') === '0' && el.getAttribute('y') === '0'
                   && el.getAttribute('width') === '300') || /^M0 0H300V/.test(d);
      if (fon) continue;
      let bb; try { bb = el.getBBox(); } catch { continue; }
      if (!bb.width && !bb.height) continue;
      bottom = Math.max(bottom, bb.y + bb.height);
    }
    return Math.ceil(bottom);
  });

  const Hb = C + GAP;
  const H = Hb + TOP + BEZEL + 6;
  return svg
    .replace(/viewBox="0 0 318 \d+"/, `viewBox="0 0 318 ${H}"`)
    .replace(/<rect x="1" y="1" width="316" height="\d+" rx="26"/, `<rect x="1" y="1" width="316" height="${H - 2}" rx="26"`)
    .replace(/<rect x="6" y="6" width="306" height="\d+" rx="20"/, `<rect x="6" y="6" width="306" height="${H - 12}" rx="20"`)
    .replace(eski, `<path d="M0 0H300V${Hb - R_IN} a${R_IN} ${R_IN} 0 0 1 -${R_IN} ${R_IN}H${R_IN}a${R_IN} ${R_IN} 0 0 1 -${R_IN} -${R_IN}Z"${atr}/>`);
}

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();

let ozgargan = 0, maket = 0;
for (const file of readdirSync(DIR).filter(f => f.endsWith('.html')).sort()) {
  const path = join(DIR, file);
  const asl = readFileSync(path, 'utf8');

  // Avval har bir figurani tartibga solamiz, keyin ichidagi SVG ni.
  let s = asl.replace(/<figure class="shot[^"]*">[\s\S]*?<\/figure>/g, tartibla);
  const svgs = [];
  s = s.replace(/<svg viewBox="0 0 318 \d+"[\s\S]*?<\/svg>/g, m => {
    svgs.push(m); return `@@MAKET${svgs.length - 1}@@`;
  });
  const tayyor = [];
  for (const svg of svgs) tayyor.push(await ramka(page, chetga(tozala(svg))));
  s = s.replace(/@@MAKET(\d+)@@/g, (_, k) => tayyor[+k]);

  maket += svgs.length;
  if (s !== asl) {
    ozgargan++;
    if (!CHECK) writeFileSync(path, s);
    console.log(`${CHECK ? ' XATO ' : '  ok  '} ${file}: ${svgs.length} ta maket ${CHECK ? 'me\'yorda emas' : 'me\'yorga keltirildi'}`);
  }
}
await browser.close();

if (CHECK && ozgargan) {
  console.error('\nMaketlar me\'yorda emas. `node tools/normalize-mockups.mjs` ni ishlating.');
  process.exit(1);
}
console.log(`${maket} ta maket${ozgargan ? '' : ' — hammasi me\'yorda'}.`);
