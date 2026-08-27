#!/usr/bin/env node
// Har bir qo'llanmani alohida tekshiradi: umumiy dvigatel yuklanadimi,
// bo'limlar to'ldiriladimi, kalkulyator hisoblaydimi va konsolda xato bormi.
//
// Nima uchun alohida test: render kodi endi guides/guide-engine.js da —
// bitta o'zgarish barcha 7 qo'llanmaga tegadi, shuning uchun hammasini
// bir yo'la tekshiramiz.
//
// Ishlatish: node tests/guides.mjs   (playwright kerak)

import { createServer } from 'node:http';
import { readFile, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8124);

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error("playwright topilmadi. `npm i -D playwright` ni ishlating.");
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png'
};

const server = createServer((req, res) => {
  let path = decodeURIComponent(req.url.split('?')[0]);
  if (path.endsWith('/')) path += 'index.html';
  const file = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  readFile(file, (err, body) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  });
});

const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' XATO '} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures.push(name);
};

const guides = readdirSync(join(ROOT, 'guides', 'inline'))
  .filter(f => f.endsWith('.html')).sort();

await new Promise(r => server.listen(PORT, r));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
// Shrift so'rovi tarmoqqa chiqmasin — testda internet bo'lmasligi mumkin.
await context.route('**fonts.googleapis.com**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));

for (const file of guides) {
  const name = file.replace('.html', '');
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const missing = [];
  page.on('response', r => { if (r.status() === 404) missing.push(new URL(r.url()).pathname); });

  await page.goto(`http://localhost:${PORT}/guides/inline/${file}`, { waitUntil: 'load' });

  /* Panellar talab bo'yicha chiziladi, shuning uchun har bir tabni ochib
     ko'ramiz: bosilgandan keyin mazmuni paydo bo'lishi kerak. */
  const info = await page.evaluate(async () => {
    const wait = () => new Promise(r => setTimeout(r, 30));
    const tabs = [...document.querySelectorAll('.tab')];
    for (const t of tabs) { t.click(); await wait(); }
    tabs[0] && tabs[0].click();
    await wait();
    return {
      tabs: tabs.length,
      wizard: (document.getElementById('wizcard') || {}).innerHTML?.length || 0,
      words: document.querySelectorAll('#wlist > *').length,
      faq: document.querySelectorAll('.acc').length,
      checklist: document.querySelectorAll('.chk').length,
      cargo: document.querySelectorAll('#cargobody > *').length,
      ban: document.querySelectorAll('#banlist > *').length,
      shared: !!document.querySelector('script[src$="guide-engine.js"]')
    };
  });

  check(`${name}: umumiy dvigatel`, info.shared);
  check(`${name}: bo'limlar to'ldi`,
    info.tabs >= 8 && info.wizard > 100 && info.words > 0 && info.faq > 0 &&
    info.checklist > 0 && info.cargo > 0 && info.ban > 0,
    `tab ${info.tabs}, lug'at ${info.words}, FAQ ${info.faq}, checklist ${info.checklist}, kuryer ${info.cargo}, taqiq ${info.ban}`);

  /* Ochilishda ortiqcha ish qilinmasin: faol bo'lmagan panellar bo'sh
     turishi kerak (talab bo'yicha chizish). */
  const lazyPage = await context.newPage();
  await lazyPage.goto(`http://localhost:${PORT}/guides/inline/${file}`, { waitUntil: 'load' });
  const atLoad = await lazyPage.evaluate(() => ({
    words: document.querySelectorAll('#wlist > *').length,
    ban: document.querySelectorAll('#banlist > *').length,
    chk: document.querySelectorAll('.chk').length,
    active: document.querySelectorAll('.panel.active').length
  }));
  check(`${name}: ochilishda faqat faol panel chiziladi`,
    atLoad.active === 1 && atLoad.words === 0 && atLoad.ban === 0 && atLoad.chk === 0,
    `lug'at ${atLoad.words}, taqiq ${atLoad.ban}, checklist ${atLoad.chk}`);
  await lazyPage.close();

  /* Sahifa yon tomonga siljimasin. */
  const over = await page.evaluate(async () => {
    const wait = () => new Promise(r => setTimeout(r, 30));
    const de = document.documentElement;
    let worst = 0, where = '';
    for (const t of document.querySelectorAll('.tab')) {
      t.click(); await wait();
      const d = de.scrollWidth - de.clientWidth;
      if (d > worst) { worst = d; where = t.textContent.trim(); }
    }
    return { worst, where };
  });
  check(`${name}: yon tomonga siljish yo'q`, over.worst <= 0, `+${over.worst}px ${over.where}`);

  /* Qadamlar ichidagi ekran maketlari: har biri chizilgan bo'lsin,
     360 px kenglikda kartochkadan chiqib ketmasin va raqamli belgilar
     yuqoridan pastga qarab o'sib borsin. */
  const shots = await page.evaluate(async () => {
    const wait = () => new Promise(r => setTimeout(r, 40));
    const tab = [...document.querySelectorAll('.tab')].find(t => /Bosqich/i.test(t.textContent));
    if (!tab) return { bor: 0, bosh: 0, chiqqan: 0, teskari: [] };
    tab.click(); await wait();
    const next = document.getElementById('wnext');
    let bor = 0, bosh = 0, chiqqan = 0; const teskari = [];
    const lim = document.documentElement.clientWidth + 0.5;
    for (let i = 0; i < 20; i++) {
      for (const f of document.querySelectorAll('#wizcard figure.shot')) {
        bor++;
        const r = f.getBoundingClientRect();
        if (r.width < 40 || r.height < 40) bosh++;
        for (const el of f.querySelectorAll('*'))
          if (el.getBoundingClientRect().right > lim) { chiqqan++; break; }
        /* Belgilar — rangli doira ustidagi raqam. Faqat shrift bo'yicha
           ajratib bo'lmaydi: maket ichida ham bir xonali qalin sonlar bor
           (masalan poyabzal o'lchami), shuning uchun doiraga qaraymiz. */
        const nums = [...f.querySelectorAll('svg text')]
          .filter(t => {
            const c = t.previousElementSibling;
            return c && c.tagName === 'circle' && c.getAttribute('r') === '10' && /^\d$/.test(t.textContent.trim());
          })
          .map(t => ({ n: +t.textContent, y: t.getBoundingClientRect().top }))
          .sort((a, b) => a.y - b.y);
        for (let k = 1; k < nums.length; k++)
          if (nums[k].n < nums[k - 1].n) { teskari.push(nums.map(x => x.n).join('')); break; }
      }
      if (!next || next.disabled) break;
      next.click(); await wait();
    }
    return { bor, bosh, chiqqan, teskari: [...new Set(teskari)] };
  });
  /* Ilovani yuklash tugmalari: har bir qo'llanmada bo'lsin va havolalari
     haqiqiy do'kon manzillariga olib borsin. */
  const apps = await page.evaluate(async () => {
    /* Tugmalar «Bosqichlar» ning ikkinchi qadamida — akkaunt/ilova qadamida. */
    const wait = () => new Promise(r => setTimeout(r, 60));
    const tab = [...document.querySelectorAll('.tab')].find(t => /Bosqich/i.test(t.textContent));
    if (tab) tab.click();
    await wait();
    /* Sehrgar oldingi tekshiruvdan keyin oxirgi qadamda turgan bo'lishi mumkin,
       shuning uchun to'g'ridan-to'g'ri ikkinchi qadamga o'tamiz. */
    const dot = document.querySelectorAll('#wizdots .dot')[1];
    if (dot) dot.click();
    await wait();
    const blok = document.querySelector('#wizcard .applinks');
    if (!blok) return { bor: false };
    const a = [...blok.querySelectorAll('a.al')];
    /* Har bir tugmada 3D do'kon ikonkasi bo'lsin va u haqiqatan yuklansin. */
    const ims = a.map(x => x.querySelector('img.al-i'));
    await Promise.all(ims.filter(Boolean).map(im => im.complete ? null : new Promise(r => {
      im.onload = r; im.onerror = r;
    })));
    return { bor: true, soni: a.length,
             nomlar: a.map(x => x.querySelector('b').textContent).join(' + '),
             ikonka: ims.every(im => im && /icons\/app-(store|play)\.webp$/.test(im.getAttribute('src'))
                                     && im.naturalWidth > 0),
             yaroqli: a.every(x => /^https:\/\/(apps\.apple\.com|play\.google\.com)\//.test(x.href)) };
  });
  check(`${name}: ilova yuklash tugmalari`,
    apps.bor && apps.soni >= 1 && apps.yaroqli && apps.ikonka,
    apps.bor ? apps.nomlar + (apps.ikonka ? ' · 3D ikonka' : ' · IKONKA YO\'Q') : 'tugma yo\'q');

  check(`${name}: qadam maketlari joyida`,
    shots.bosh === 0 && shots.chiqqan === 0 && shots.teskari.length === 0,
    `${shots.bor} ta maket, bo'sh ${shots.bosh}, chiqqan ${shots.chiqqan}`
      + (shots.teskari.length ? ', teskari belgilar: ' + shots.teskari.join(' ') : ''));

  // Kalkulyator: qiymat kiritilganda natija qayta hisoblanadi.
  await page.getByRole('button', { name: /Kalkulyator/ }).first().click();
  const before = (await page.textContent('#result')).trim();
  // Joriy qiymatdan farqli son kiritamiz (ba'zi qo'llanmalarda standart 900).
  const price = Number(await page.inputValue('#price')) || 100;
  await page.fill('#price', String(price * 2 + 7));
  await page.waitForTimeout(80);
  const after = (await page.textContent('#result')).trim();
  check(`${name}: kalkulyator qayta hisoblaydi`, after !== before && /so’m|so'm/.test(after),
    after.split('\n')[0].slice(0, 28));

  /* Qisqa yakun tasmasi: maydonlar to'ldirilayotganda ko'rinadi va hech
     narsani to'smaydi, to'liq natijaga yetganda o'chadi. */
  const miniState = await page.evaluate(async () => {
    const wait = () => new Promise(r => setTimeout(r, 350));
    const m = document.querySelector('.res-mini');
    if (!m) return { bor: false };
    window.scrollTo(0, 0); await wait();
    const yuqorida = !m.classList.contains('off');
    const matn = m.textContent.replace(/\s+/g, ' ').trim();
    /* Tasma formadagi maydonni to'smasin: eng pastdagi ko'rinib turgan
       maydon tasmaning tepasidan yuqorida bo'lishi shart emas, lekin
       tasmaning o'zi ekranning yarmidan ko'pini egallamasligi kerak. */
    const ulush = m.getBoundingClientRect().height / innerHeight;
    document.getElementById('result').scrollIntoView({ block: 'center' });
    /* Kuzatuvchi (IntersectionObserver) keyingi kadrda ishlaydi — belgini
       kutamiz, qat'iy uxlash bilan test tasodifan yiqilmasin. */
    for (let i = 0; i < 20 && !m.classList.contains('off'); i++) await wait();
    return { bor: true, yuqorida, ochdi: m.classList.contains('off'), matn, ulush };
  });
  check(`${name}: yakun tasmasi ishlaydi`,
    miniState.bor && miniState.yuqorida && miniState.ochdi && miniState.ulush < 0.2,
    miniState.bor ? `${miniState.matn.slice(0, 34)} · ekranning ${Math.round(miniState.ulush * 100)}%` : 'tasma yo\'q');

  check(`${name}: konsol toza`, errors.length === 0, errors.slice(0, 2).join(' | '));
  check(`${name}: 404 yo'q`, missing.length === 0, missing.join(', '));
  await page.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.error(`\n${failures.length} ta tekshiruv yiqildi: ${failures.join(', ')}`);
  process.exit(1);
}
console.log(`\nHammasi joyida — ${guides.length} ta qo'llanma tekshirildi.`);
