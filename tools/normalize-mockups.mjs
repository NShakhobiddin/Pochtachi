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
//   5. Har bir belgi aynan qaysi elementni ko'rsatayotgani chiziladi:
//      izohdagi qalin/tirnoqli/iyeroglif atama maketda topilsa — o'sha
//      matn, topilmasa belgi turgan qator ramkaga olinadi va belgiga
//      punktir bilan ulanadi.
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

/* 5. Belgi aynan qaysi elementni ko'rsatayotgani. */
const MARK_RE = /<g class="xy-mark">.*?<\/g>/g;
async function belgila(page, fig) {
  if (!/<svg viewBox/.test(fig)) return fig;
  await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0">' + fig);
  const marks = await page.evaluate(() => {
    const norm = s => s.toLowerCase().replace(/[«»"'’‘.,:;()]/g, '').replace(/\s+/g, ' ').trim();
    const g = document.querySelector('svg g[transform]');
    const kids = [...g.children];
    const badges = [], belgiEl = new Set();
    kids.forEach((el, i) => {
      if (el.tagName === 'circle' && el.getAttribute('r') === '11.5') {
        badges.push({ n: +kids[i + 2].textContent, cx: +el.getAttribute('cx'), cy: +el.getAttribute('cy') });
        [el, kids[i + 1], kids[i + 2]].forEach(x => x && belgiEl.add(x));
      }
    });
    const lis = [...document.querySelectorAll('.legend-list li')];
    const bb = el => { try { const b = el.getBBox(); return b.width || b.height ? b : null; } catch { return null; } };
    const texts = [...g.querySelectorAll('text')].filter(t => !belgiEl.has(t))
      .map(t => ({ b: bb(t), s: t.textContent })).filter(x => x.b);
    const shapes = [...g.querySelectorAll('rect,path,circle,image')].filter(el => !belgiEl.has(el))
      .map(el => ({ b: bb(el) })).filter(x => x.b && x.b.width < 292 && x.b.width > 24);

    return badges.map(bd => {
      const li = lis.find(l => +l.querySelector('b').textContent === bd.n);
      if (li) {
        const nomzod = [];
        li.querySelectorAll('b').forEach(x => { if (!/^\d$/.test(x.textContent)) nomzod.push(x.textContent); });
        (li.textContent.match(/[\u3400-\u9fff\uf900-\ufaff]+/g) || []).forEach(x => nomzod.push(x));
        (li.textContent.match(/«([^»]{2,40})»/g) || []).forEach(x => nomzod.push(x.slice(1, -1)));
        const uniq = [...new Set(nomzod.map(x => x.trim()).filter(x => x.length >= 2))]
          .sort((a, b) => b.length - a.length);
        /* Atama bir necha joyda uchrashi mumkin — belgiga eng yaqinini
           olamiz; juda uzoqdagisi qabul qilinmaydi, aks holda ko'rsatkich
           butun ekran bo'ylab cho'ziladi. */
        for (const c of uniq) {
          const mos = texts.filter(t => norm(t.s).includes(norm(c)))
            .map(t => ({ t, d: Math.abs(t.b.y + t.b.height / 2 - bd.cy) }))
            .sort((a, b) => a.d - b.d)[0];
          if (mos && mos.d <= 60)
            return { cx: bd.cx, cy: bd.cy, x: mos.t.b.x, y: mos.t.b.y, w: mos.t.b.width, h: mos.t.b.height };
        }
      }
      const qator = texts.filter(t => t.b.y - 9 <= bd.cy && bd.cy <= t.b.y + t.b.height + 9);
      if (qator.length) {
        const x1 = Math.min(...qator.map(t => t.b.x)), x2 = Math.max(...qator.map(t => t.b.x + t.b.width));
        const y1 = Math.min(...qator.map(t => t.b.y)), y2 = Math.max(...qator.map(t => t.b.y + t.b.height));
        return { cx: bd.cx, cy: bd.cy, x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
      }
      const ich = shapes.filter(s => s.b.y - 4 <= bd.cy && bd.cy <= s.b.y + s.b.height + 4)
                        .sort((a, b) => a.b.width * a.b.height - b.b.width * b.b.height)[0];
      return ich ? { cx: bd.cx, cy: bd.cy, x: ich.b.x, y: ich.b.y, w: ich.b.width, h: ich.b.height } : null;
    }).filter(Boolean);
  });

  const P = 3;
  const chiz = marks.map(m => {
    const x = Math.max(1, m.x - P), y = m.y - P;
    const w = Math.min(298 - x, m.w + P * 2), h = m.h + P * 2;
    const bx = m.cx > 150 ? x + w : x;
    const by = Math.min(Math.max(m.cy, y + 2), y + h - 2);
    const dx = m.cx - bx, dy = m.cy - by, uz = Math.hypot(dx, dy);
    const chiziq = uz > 15
      ? `<path d="M${bx.toFixed(1)} ${by.toFixed(1)}L${(m.cx - dx / uz * 12).toFixed(1)} ${(m.cy - dy / uz * 12).toFixed(1)}" stroke="#4f46e5" stroke-width="1.2" stroke-dasharray="2.5 2.5" fill="none"/>` : '';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="#4f46e5" fill-opacity=".09" stroke="#4f46e5" stroke-width="1.4"/>${chiziq}`;
  }).join('');
  if (!chiz) return fig;
  // Belgilardan oldin chizamiz — raqamlar tepada qolsin.
  const i = fig.search(/<circle cx="(?:288|12)" cy="[\d.]+" r="11\.5"/);
  return i < 0 ? fig : fig.slice(0, i) + `<g class="xy-mark">${chiz}</g>` + fig.slice(i);
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

  /* Avval eski belgilashni olib tashlaymiz (ular yangidan hisoblanadi va
     ramka balandligiga qo'shilib ketmasligi kerak), keyin figurani
     tartibga solamiz, SVG ni me'yorlaymiz va oxirida qaytadan belgilaymiz. */
  let s = asl.replace(MARK_RE, '')
             .replace(/<figure class="shot[^"]*">[\s\S]*?<\/figure>/g, tartibla);
  const svgs = [];
  s = s.replace(/<svg viewBox="0 0 318 \d+"[\s\S]*?<\/svg>/g, m => {
    svgs.push(m); return `@@MAKET${svgs.length - 1}@@`;
  });
  const tayyor = [];
  for (const svg of svgs) tayyor.push(await ramka(page, chetga(tozala(svg))));
  s = s.replace(/@@MAKET(\d+)@@/g, (_, k) => tayyor[+k]);

  const figs = [];
  s = s.replace(/<figure class="shot[^"]*">[\s\S]*?<\/figure>/g, m => {
    figs.push(m); return `@@FIGURA${figs.length - 1}@@`;
  });
  const belgili = [];
  for (const f of figs) belgili.push(await belgila(page, f));
  s = s.replace(/@@FIGURA(\d+)@@/g, (_, k) => belgili[+k]);

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
