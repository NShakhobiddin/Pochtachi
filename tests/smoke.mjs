#!/usr/bin/env node
// Ilovaning asosiy yo'llari ishlayotganini tekshiradi.
// Ishlatish: node tests/smoke.mjs   (playwright kerak)
//
// Tekshiriladi: ilova ko'tariladi, bo'limlar almashadi, bojxona kalkulyatori
// to'g'ri hisoblaydi, qo'llanma iframe'da ochiladi, konsolda xato yo'q,
// hech qanday fayl 404 bermaydi va data/norms.json koddagi zaxira bilan mos.

import { createServer } from 'node:http';
import { readFile, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8123);

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
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};

/* Server ko'rgan so'rovlar: service worker keshi ishlayotganini shu yerdan
   bilamiz — sahifa `request` hodisasi worker ichidagi so'rovlarni ko'rmaydi. */
const hits = [];
const server = createServer((req, res) => {
  let path = decodeURIComponent(req.url.split('?')[0]);
  hits.push(path);
  if (path.endsWith('/')) path += 'index.html';
  const file = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  readFile(file, (err, body) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  });
});

const src = readFileSync(join(ROOT, 'Xarid Yordamchisi v2.dc.html'), 'utf8');
const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' XATO '} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures.push(name);
};

// Onboarding'dan o'tib, asosiy ekranga chiqadi.
async function passOnboarding(page) {
  for (let i = 0; i < 14; i++) {
    if (await page.locator('nav').count()) return true;
    const buttons = page.locator('button:visible');
    const n = await buttons.count();
    if (!n) return false;
    let target = null;
    for (let j = 0; j < n; j++) {
      const text = (await buttons.nth(j).innerText().catch(() => '')).trim();
      if (/^(Davom|Boshlash|Keyingi|Tayyor|Boshladik|Kirish|Ha,|Yo'q)/i.test(text)) { target = buttons.nth(j); break; }
    }
    await (target || buttons.first()).click().catch(() => {});
    await page.waitForTimeout(300);
  }
  return !!(await page.locator('nav').count());
}

await new Promise(r => server.listen(PORT, r));
const base = `http://localhost:${PORT}`;
const browser = await chromium.launch();
/* Buferga nusxalash tekshiruvi uchun ruxsat kerak: Chromium'da
   navigator.clipboard yozish/o'qish ruxsatsiz rad etiladi. */
/* Brend introsi har ochilishda 3 soniya o'ynaydi va ekranni to'sadi.
   Qolgan tekshiruvlar uni kutib o'tirmasin — reducedMotion bilan ochamiz,
   intro o'sha holatda o'zini ko'rsatmaydi; introning o'zi pastda alohida
   tekshiriladi. */
const context = await browser.newContext({ viewport: { width: 430, height: 880 },
  permissions: ['clipboard-read', 'clipboard-write'], reducedMotion: 'reduce' });
// Har bir hujjatda tartib siljishini (CLS) o'lchab boramiz
await context.addInitScript(() => {
  window.__cls = 0;
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
});
const page = await context.newPage();

const errors = [];
const missing = [];
page.on('pageerror', e => errors.push(e.message));
// Ma'lum va zararsiz xabarlar: shriftlar test muhitida tashqi domendan
// yuklanmaydi. SVG `d="{{ ... }}"` xatosi ilgari shu ro'yxatda edi — endi
// belgilar CSS foniga o'tkazilgani uchun umuman chiqmaydi va yashirilmaydi.
const BENIGN = /font|CORS|net::ERR/i;
page.on('console', m => { if (m.type() === 'error' && !BENIGN.test(m.text())) errors.push(m.text()); });
page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) missing.push(r.status() + ' ' + r.url()); });
/* Oddiy brauzerda ilova tashqariga faqat valyuta kursi uchun chiqadi.
   Shrift, SDK va boshqa hamma narsa o'z domenimizda — birinchi bo'yoq
   uchinchi tomon serveriga bog'liq bo'lmasligi kerak. */
const tgRequests = [];
const thirdParty = [];
/* O'lchov manzili: bo'sh (o'chiq) yoki loyihaning o'z Cloudflare Worker'i.
   To'ldirilgan bo'lsa u "uchinchi tomon" hisoblanmaydi — sanoq bizniki. */
const METRICS_URL = (/const METRICS_URL = '([^']*)'/.exec(src) || [])[1] || '';
const metricsHost = METRICS_URL ? new URL(METRICS_URL).host : '';
page.on('request', r => {
  const u = r.url();
  if (u.includes('telegram.org')) tgRequests.push(u);
  if (!u.startsWith(base) && !u.startsWith('data:') && !u.includes('cbu.uz') && !(metricsHost && new URL(u).host === metricsHost)) thirdParty.push(new URL(u).host);
});

try {
  // 1. Ilova ko'tariladi
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  check('ilova ko\'tariladi', await page.evaluate(() => !!document.querySelector('#dc-root')?.firstChild));
  /* Brend logotipi: tanishuv ekranida shior bilan, sarlavhada shiorsiz.
     naturalWidth 0 bo'lsa rasm yuklanmagan — 404 yoki noto'g'ri yo'l shu
     yerda ko'rinadi. */
  const onbLogo = await page.evaluate(() => {
    const im = [...document.images].find(i => /brand-full\.webp/.test(i.currentSrc || i.src));
    return im ? { w: Math.round(im.getBoundingClientRect().width), nat: im.naturalWidth } : null;
  });
  check('tanishuv ekranida logotip', !!onbLogo && onbLogo.nat > 0 && onbLogo.w >= 200,
    onbLogo ? `${onbLogo.w}px, manba ${onbLogo.nat}px` : 'topilmadi');
  check('onboarding o\'tadi', await passOnboarding(page));
  const homeLogo = await page.evaluate(() => {
    const im = document.querySelector('header img');
    if (!im) return null;
    const r = im.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), nat: im.naturalWidth,
      alt: im.alt, src: (im.currentSrc || im.src).split('/').pop() };
  });
  check('bosh sarlavhada logotip', !!homeLogo && homeLogo.src === 'brand.webp'
    && homeLogo.nat > 0 && homeLogo.h >= 32 && !!homeLogo.alt,
    homeLogo ? `${homeLogo.src} ${homeLogo.w}x${homeLogo.h}, alt "${homeLogo.alt}"` : 'topilmadi');

  // 2. Bo'limlar almashadi
  for (const tab of ["Qo'llanmalar", 'Bojxona', 'Sozlamalar', 'Bosh sahifa']) {
    await page.locator('nav button', { hasText: tab }).first().click();
    await page.waitForTimeout(500);
    const current = await page.evaluate(() =>
      [...document.querySelectorAll('nav button')].find(b => b.getAttribute('aria-current') === 'page')?.innerText.split('\n')[0] || '');
    check(`bo'lim ochiladi: ${tab}`, current.trim() === tab);
  }

  // 3. Bojxona kalkulyatori alohida qatorda va bosilganda ochiladi
  await page.locator('nav button', { hasText: 'Bojxona' }).first().click();
  await page.waitForTimeout(600);
  const calcRow = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => /Bojxona kalkulyatori/.test(x.innerText));
    return { bor: !!b, matn: b ? b.innerText.replace(/\n/g, ' · ') : '' };
  });
  check('kalkulyator alohida qator bo\'lib turadi', calcRow.bor, calcRow.matn.slice(0, 60));

  // Har bir bojxona qatorida o'z ikonkasi bor va u yuklangan
  const bojIcons = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img[src*="icons/boj-"]')];
    return { soni: imgs.length,
             yuklandi: imgs.filter(i => i.complete && i.naturalWidth > 0).length,
             nomlar: imgs.map(i => i.src.split('/').pop()).join(', ') };
  });
  check('bojxona qatorlarida ikonkalar bor',
    bojIcons.soni === 6 && bojIcons.yuklandi === 6,
    `${bojIcons.yuklandi}/${bojIcons.soni} yuklandi`);

  await page.getByText('Bojxona kalkulyatori', { exact: false }).first().click();
  await page.waitForTimeout(700);
  const calc = await page.evaluate(() => {
    const text = document.body.innerText;
    const m = text.match(/([\d\s]+)\s*so'm/g);
    return { natija: m ? m.map(x => x.replace(/\s+/g, ' ').trim()).slice(0, 3).join(' | ') : '',
             maydonlar: document.querySelectorAll('input').length };
  });
  check('bosilganda kalkulyator ochiladi va hisoblaydi',
    /\d/.test(calc.natija) && calc.maydonlar >= 3,
    `${calc.maydonlar} ta maydon · ${calc.natija.slice(0, 40)}`);
  /* Manfiy og'irlik yoki yetkazish narxi bojni kamaytirmasin: ilgari
     "-2.5 kg" bojxona qiymatini pasaytirib, to'lovni kam ko'rsatardi.
     Manfiy qiymat nol bilan bir xil natija berishi kerak. */
  const jami = async () => (await page.evaluate(() => (document.body.innerText.match(/([\d\s]+)\s*so'm/) || ['', ''])[1].replace(/\s+/g, '')));
  const maydon = page.locator('main input');
  const yoz = async (i, v) => { await maydon.nth(i).fill(v); await maydon.nth(i).dispatchEvent('change'); await page.waitForTimeout(250); };
  await yoz(0, '320'); await yoz(1, '2.5'); await yoz(2, '9');
  const oddiy = await jami();
  await yoz(1, '0'); const nolVazn = await jami();
  await yoz(1, '-2.5'); const manfiyVazn = await jami();
  await yoz(1, '2.5'); await yoz(2, '-9'); const manfiyYet = await jami();
  await yoz(2, '0'); const nolYet = await jami();
  check('manfiy og\'irlik va yetkazish bojni kamaytirmaydi',
    +oddiy > +nolVazn && manfiyVazn === nolVazn && manfiyYet === nolYet,
    `2.5 kg: ${oddiy} · 0 kg: ${nolVazn} · -2.5 kg: ${manfiyVazn} · -9 $/kg: ${manfiyYet}`);
  /* Katta summa minglik ajratkich bilan, $1 dan kichik ortiqcha "$0" emas. */
  await yoz(0, '1000000'); await yoz(1, '100'); await yoz(2, '9');
  const katta = await page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' '));
  await yoz(0, '200.01'); await yoz(1, '1');
  const kichik = await page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' '));
  check('kalkulyator: dollar ajratkich va tiyinli ortiqcha',
    /me'yordan \$999 800 ortiq/.test(katta) && /\$1 000 700 × 30% = \$300 210/.test(katta) && /me'yordan \$0\.01 ortiq/.test(kichik),
    (katta.match(/me'yordan [^o]+ortiq/) || [''])[0] + ' | ' + (kichik.match(/me'yordan [^o]+ortiq/) || [''])[0]);
  await yoz(0, '320'); await yoz(1, '2.5'); await yoz(2, '9');
  await page.goBack();
  await page.waitForTimeout(400);

  /* «Reja» bo'limi: 5 qadam, tanlovni o'zgartirish va logotiplar. */
  await page.locator('nav button', { hasText: 'Reja' }).first().click();
  await page.waitForTimeout(600);
  for (const re of [/Elektronika|Kiyim|Poyabzal/, /Xitoy|AQSh|Turkiya/]) {
    await page.locator('button:visible').filter({ hasText: re }).first().click();
    await page.waitForTimeout(500);
  }

  /* Bosqich yozuvlarida bo'lim nomi emas, tanlangan javob turishi kerak —
     3-qadamda ham qaysi kategoriya va davlat tanlangani ko'rinadi. */
  const wizJavob = await page.evaluate(() =>
    [...document.querySelectorAll('button[aria-label*="qadam"]')]
      .map(b => b.querySelector('span').textContent.trim()));
  check('reja qadamlarida tanlangan javob ko\'rinadi',
    wizJavob.length === 5 && !/^Mahsulot$/.test(wizJavob[0]) && !/^Davlat$/.test(wizJavob[1]),
    wizJavob.join(' | '));

  /* O'tilgan qadamga bosib qaytish mumkin (ilgari faqat boshidan boshlash bor edi). */
  await page.locator('button[aria-label*="qadam"]').first().click({ force: true });
  await page.waitForTimeout(500);
  const wizQaytdi = await page.evaluate(() =>
    (document.querySelector('span[style*="999px"][style*="tabular-nums"]') || {}).textContent || '');
  check('o\'tilgan qadamga qaytish ishlaydi', /^1\s*\/\s*5/.test(wizQaytdi.replace(/\s+/g, ' ')), wizQaytdi.trim());

  for (const re of [/Elektronika|Kiyim|Poyabzal/, /Xitoy|AQSh|Turkiya/]) {
    await page.locator('button:visible').filter({ hasText: re }).first().click();
    await page.waitForTimeout(500);
  }

  /* Boshqa bo'limga chiqib qaytganda tanlovlar saqlanishi kerak. */
  await page.locator('nav button', { hasText: 'Bojxona' }).first().click();
  await page.waitForTimeout(400);
  await page.locator('nav button', { hasText: 'Reja' }).first().click();
  await page.waitForTimeout(600);
  const wizSaqlandi = await page.evaluate(() =>
    (document.querySelector('span[style*="999px"][style*="tabular-nums"]') || {}).textContent || '');
  check('bo\'limga qaytganda qadam saqlanadi', /^3\s*\/\s*5/.test(wizSaqlandi.replace(/\s+/g, ' ')), wizSaqlandi.trim());
  const wizLogo = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find(b => /Marketplace|Premium/.test(b.innerText) && b.querySelector('div[style*="background-image"]'));
    if (!btn) return { bor: false };
    const img = btn.querySelector('div[style*="background-image"]');
    const box = img.parentElement;
    const r = box.getBoundingClientRect();
    return { bor: true, w: Math.round(r.width), h: Math.round(r.height),
             fit: getComputedStyle(img).backgroundSize };
  });
  /* Logotiplar kvadrat ilova ikonkasi bo'lgani uchun quti ham kvadrat;
     `contain` nisbatni saqlaydi, ya'ni ikonka cho'zilmaydi. */
  check('rejadagi do\'kon logotipi cho\'zilmaydi',
    wizLogo.bor && wizLogo.w === wizLogo.h && wizLogo.fit === 'contain',
    wizLogo.bor ? `${wizLogo.w}x${wizLogo.h}, ${wizLogo.fit}` : 'topilmadi');

  /* 4. Qidiruv o'z ekranida: sarlavhadagi lupa tugmasi ochadi. Bosh
     sahifada maydon yo'q, shuning uchun yozganda sahifa qimirlamaydi. */
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(500);
  check('bosh sahifada qidiruv maydoni yo\'q',
    await page.evaluate(() => document.querySelectorAll('main input').length === 0));
  await page.locator('button[aria-label="Qidirish"]').first().click();
  await page.waitForTimeout(600);
  /* Ochilganda maydon fokusda: telefonda klaviatura o'zi chiqadi. */
  check('qidiruv ochilganda maydon fokusda',
    await page.evaluate(() => document.activeElement && document.activeElement.type === 'search'));
  /* Bo'sh qidiruv oynasi bo'm-bo'sh emas: ko'p qidiriladigan so'zlar, toifa
     kartalari va bojxonaga tez havolalar turadi. */
  const idleText = await page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' '));
  check('bo\'sh qidiruvda takliflar: so\'zlar, toifalar, bojxona',
    /Ko'p qidiriladi/i.test(idleText) && /krossovka/.test(idleText) && /Poyabzal\s*7 ta do'kon/.test(idleText) &&
    /Bojxona kalkulyatori/.test(idleText) && /Taqiqlangan tovarlar/.test(idleText), idleText.slice(0, 200));
  const input = page.locator('main input[type=search]').first();
  /* Toifa sinonimlari: "krossovka" do'kon matnida yo'q, lekin poyabzal
     do'konlarining hammasi topiladi va tepada butun bo'limga havola turadi. */
  const qidir = async (q) => { await input.fill(q); await page.waitForTimeout(350);
    return page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' ')); };
  let t = await qidir('krossovka');
  check('krossovka -> Poyabzal bo\'limi, Nike va Adidas', /Poyabzal 7 ta do'kon Bo'lim/.test(t) && /Nike/.test(t) && /Adidas/.test(t), t.slice(0, 200));
  t = await qidir('telefon');
  check('telefon -> Elektronika do\'konlari', /Elektronika 8 ta do'kon/.test(t) && /Apple Store/.test(t), t.slice(0, 200));
  t = await qidir('кроссовки');
  check('ruscha "кроссовки" -> poyabzal', /Nike/.test(t), t.slice(0, 200));
  t = await qidir('Турция');
  check('ruscha "Турция" -> Trendyol va ASE', /Trendyol/.test(t) && /ASE/.test(t), t.slice(0, 200));
  /* Ko'p so'zli so'rov: har bir so'z alohida topiladi. Bojxona bo'limlari va
     taqiqlangan tovarlar ham natijada. Hech narsa topilmasa toifa kartalari
     baribir turadi. */
  t = await qidir('pinduoduo qollanma');
  check('ko\'p so\'zli so\'rov: "pinduoduo qollanma"', /Pinduoduo/.test(t) && /Qo'llanma/.test(t), t.slice(0, 160));
  t = await qidir('dron');
  check('qidiruvda taqiqlangan tovar: dron', /Uchuvchisiz uchish apparatlari/.test(t) && /Cheklangan/.test(t), t.slice(0, 160));
  t = await qidir('kalkulyator');
  check('qidiruvda bojxona bo\'limi: kalkulyator', /Bojxona kalkulyatori/.test(t) && /Ma'lumotnoma/.test(t), t.slice(0, 160));
  t = await qidir('zzqqzz');
  check('natija yo\'q bo\'lsa ham toifa kartalari turadi', /Hech narsa topilmadi/.test(t) && /Toifa bo'yicha/i.test(t) && /Poyabzal/.test(t), t.slice(0, 160));
  /* Toifa qatori bosilganda papka ochiladi. */
  await input.fill('krossovka'); await page.waitForTimeout(350);
  await page.locator('main button').filter({ hasText: /Poyabzal/ }).first().click();
  await page.waitForTimeout(600);
  check('toifa qatori papkani ochadi',
    await page.evaluate(() => /Krossovka, sneaker, sport/.test(document.querySelector('main').innerText)));
  await page.locator('button[aria-label="Orqaga qaytish"]').first().click().catch(() => {});
  await page.waitForTimeout(500);
  if (!(await page.locator('main input[type=search]').count())) {
    await page.locator('button[aria-label="Qidirish"]').first().click(); await page.waitForTimeout(500);
  }
  /* Toifa qatori ochilgani tarixga "krossovka" ni yozdi; keyingi "bo'sh
     shaxsiy bloklar" tekshiruvi toza tarix kutadi. */
  await page.locator('button[aria-label="Qidiruv tarixini tozalash"]').first().click().catch(() => {});
  await page.waitForTimeout(200);
  const input2 = page.locator('main input[type=search]').first();
  await input2.fill('Али');
  await page.waitForTimeout(400);
  check('kirillcha qidiruv ishlaydi', /AliExpress/i.test(await page.evaluate(() => document.body.innerText)));
  check('qidiruvni tozalash tugmasi nomli va 32px',
    await page.evaluate(() => { const b = document.querySelector('main label button');
      const r = b ? b.getBoundingClientRect() : { width: 0 };
      return !!b && !!b.getAttribute('aria-label') && r.width >= 32 && r.height >= 32; }));
  /* Escape: bo'sh maydonda ekran yopiladi (kompyuter va Telegram Desktop). */
  await input2.fill('');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  check('Escape qidiruvni yopadi',
    await page.evaluate(() => document.querySelectorAll('main input[type=search]').length === 0));

  // 5. Qo'llanma iframe'da ochiladi
  await page.locator('nav button', { hasText: "Qo'llanmalar" }).first().click();
  await page.waitForTimeout(900);

  /* Qo'llanma kartochkalarida qo'llanmaning o'z 3D ikonkasi
     (icons/guide-*.webp). Ilgari do'kon logotipi, undan oldin monogramma. */
  const guideLogos = await page.evaluate(async () => {
    const wanted = ['taobao', 'pinduoduo', 'poizon', 'shein', 'trendyol', 'amazon', 'ebay'];
    const found = [...document.querySelectorAll('div')]
      .map(d => (d.style.backgroundImage || '').match(/icons\/guide-([a-z0-9-]+)\.webp/))
      .filter(Boolean).map(m => m[1]);
    const ok = await Promise.all(wanted.map(w => new Promise(r => {
      const im = new Image(); im.onload = () => r(true); im.onerror = () => r(false); im.src = 'icons/guide-' + w + '.webp';
    })));
    return { bor: wanted.filter(w => found.includes(w)), yuklandi: ok.filter(Boolean).length };
  });
  check('qo\'llanma kartochkalarida o\'z ikonkasi', guideLogos.bor.length === 7 && guideLogos.yuklandi === 7,
    guideLogos.bor.join(', ') + ' · ' + guideLogos.yuklandi + ' yuklandi');

  /* Logotip kvadrat ikonka bo'lgani uchun ostidagi ohang plita olib
     tashlangan — rang endi ikonkaning o'zida. Quti shaffof ekanini va
     ikonka to'ldirib turganini tekshiramiz. */
  const quti = await page.evaluate(() =>
    [...document.querySelectorAll('main div[style*="width: 54px"]')].map(d => ({
      fon: getComputedStyle(d).backgroundColor,
      rasm: !!(d.querySelector('div[style*="background-image"]'))
    })));
  check("qo'llanma kartochkasida kvadrat logotip",
    quti.length === 7 && quti.every(q => q.rasm) &&
    quti.every(q => q.fon === 'rgba(0, 0, 0, 0)'),
    `${quti.length} ta quti, rasmli ${quti.filter(q => q.rasm).length}`);

  /* Yettita qo'llanma davlat bo'yicha guruhlangan. Kartochka oq: rang
     do'konning kvadrat logotipida turadi, kartaning o'zi bo'yalmaydi —
     aks holda yuza kir bo'lib ko'rinadi. */
  const grp = await page.evaluate(() => {
    /* Dvigatel {{ }} ni yana bitta span ichiga o'raydi, shuning uchun
       tashqi o'ram ham mos keladi — ichkarisini olamiz. */
    const bosh = [...document.querySelectorAll('main span')]
      .filter(x => x.children.length === 0 &&
        /^(Xitoy|Turkiya|AQSh|Global|Buyuk Britaniya|BAA)$/.test((x.textContent || '').trim()));
    const kart = [...document.querySelectorAll('main button')]
      .filter(x => /BO'LIM/.test(x.innerText));
    const oq = kart.every(x => getComputedStyle(x).backgroundColor === 'rgb(255, 255, 255)');
    return { guruh: bosh.map(x => x.textContent.trim()), kart: kart.length, oq };
  });
  check("qo'llanmalar davlat bo'yicha guruhlangan",
    grp.guruh.length === 3 && grp.guruh[0] === 'Xitoy' && grp.kart === 7 && grp.oq,
    `${grp.guruh.join(' / ')} · ${grp.kart} kartochka, oq fon ${grp.oq}`);

  /* Ekran almashganda kirish animatsiyasi qayta ishga tushadi. */
  await page.locator('nav button', { hasText: 'Bojxona' }).first().click();
  await page.waitForTimeout(80);
  check('ekran almashganda animatsiya boshlanadi',
    await page.evaluate(() => document.querySelector('main').classList.contains('xy-in')));

  /* Ichkariga kirganda tepadan, orqaga qaytganda o'sha joyidan. */
  await page.locator('nav button', { hasText: "Qo'llanmalar" }).first().click();
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('main').scrollTo(0, 400));
  await page.waitForTimeout(200);
  const wasTop = await page.evaluate(() => document.querySelector('main').scrollTop);
  await page.getByText('SHEIN', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  const inTop = await page.evaluate(() => document.querySelector('main').scrollTop);
  await page.goBack();
  await page.waitForTimeout(800);
  const backTop = await page.evaluate(() => document.querySelector('main').scrollTop);
  check('yangi ekran tepadan boshlanadi', inTop === 0, String(inTop));
  check('orqaga qaytganda joyi eslanadi', wasTop > 0 && Math.abs(backTop - wasTop) < 4,
    `${wasTop} -> ${backTop}`);

  await page.getByText('Taobao', { exact: true }).first().click();
  await page.waitForTimeout(1800);
  const frame = page.frames().find(f => f.url().includes('guides/'));
  check('qo\'llanma ochiladi', !!frame, frame ? frame.url().split('/').pop() : '');

  // 6. Qo'llanmalar ro'yxati mustaqil sahifa sifatida ishlaydi
  const hub = await context.newPage();
  await hub.goto(base + '/guides/', { waitUntil: 'load' });
  check('qo\'llanmalar ro\'yxati', (await hub.locator('.guide-card').count()) === 7);
  await hub.close();

  /* Qo'llanmalardagi yetkazish jadvali ilovaning Kuryerlar bo'limi bilan
     mos bo'lsin: foydalanuvchi u yerda ko'rgan kompaniyani ilovadan ham
     topa olishi kerak. Platformaning o'z yetkazishi bundan mustasno. */
  {
    const nomlar = [...src.matchAll(/"id":"[a-z0-9]+","name":"([^"]+)"/g)].map(m => m[1]);
    const kalit = t => t.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ilovada = new Set(nomlar.map(kalit));
    const ozi = /amazonglobal|ebayinternationalshipping|sotuvchining/;
    const begona = [];
    let jami = 0;
    for (const g of ['amazon', 'ebay', 'pinduoduo', 'poizon', 'shein', 'taobao', 'trendyol']) {
      const html = readFileSync(join(ROOT, 'guides', 'inline', `${g}.html`), 'utf8');
      const m = html.match(/^const CARGO=(\[[\s\S]*?\]);$/m);
      if (!m) { begona.push(`${g}: ro'yxat yo'q`); continue; }
      const rows = [...m[1].matchAll(/"n":"([^"]+)"/g)].map(x => x[1]);
      if (!rows.length) begona.push(`${g}: bo'sh`);
      jami += rows.length;
      for (const n of rows) if (!ilovada.has(kalit(n)) && !ozi.test(kalit(n))) begona.push(`${g}: ${n}`);
    }
    check('qo\'llanmalardagi kuryerlar ilovada ham bor',
      begona.length === 0, begona.length ? begona.join(', ') : `${jami} ta qator, ${nomlar.length} ta kuryer`);
  }

  // 7. Me'yorlar fayli koddagi zaxira bilan mos
  const norms = JSON.parse(readFileSync(join(ROOT, 'data', 'norms.json'), 'utf8'));
  const inCode = (src.match(/\{ from:'[\d-]+', bhm:\d+/g) || []).length;
  check('data/norms.json to\'g\'ri', Array.isArray(norms.norms) && norms.norms.length > 0
    && norms.norms.every(n => n.bhm > 0 && n.freeUsd > 0 && n.src));
  check('koddagi zaxira me\'yorlar mavjud', inCode === norms.norms.length, `kod: ${inCode}, json: ${norms.norms.length}`);

  // 8. Pastki menyu har bir bo'limda ko'rinib turadi (ilgari iOS'da brauzer
  //    paneli uni ekrandan chiqarib yuborardi)
  for (const tab of ['Bosh sahifa', 'Bojxona', 'Sozlamalar']) {
    await page.locator('nav button', { hasText: tab }).first().click();
    await page.waitForTimeout(400);
    const fits = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      if (!nav) return false;
      const r = nav.getBoundingClientRect();
      return r.height > 0 && r.bottom <= window.innerHeight + 2 && r.top < window.innerHeight;
    });
    check(`pastki menyu ko'rinadi: ${tab}`, fits);
  }

  // 9. "Orqaga" ilovadan chiqarib yubormaydi
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(400);
  await page.getByText("Do'konlar", { exact: true }).first().click();
  await page.waitForTimeout(600);
  await page.goBack();
  await page.waitForTimeout(600);
  check('orqaga tugmasi ilova ichida qoladi',
    await page.evaluate(() => !!document.querySelector('#dc-root')?.firstChild));

  // 10. Manbada qotib qolgan sana yo'q (reja kartasi va versiya ilgari
  //     har doim 31.07.2026 ni ko'rsatardi)
  const template = src.slice(0, src.indexOf('<script type="text/x-dc"'));
  const frozen = template.match(/\d{2}\.\d{2}\.20\d{2}/g) || [];
  check('shablonda qotib qolgan sana yo\'q', frozen.length === 0, frozen.slice(0, 3).join(', '));

  // 10b. Do'konlar bo'limi papka ko'rinishida ochiladi
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(400);
  await page.getByText("Do'konlar", { exact: false }).first().click();
  await page.waitForTimeout(600);
  const folders = await page.evaluate(() => ({
    chooser: /Bo'lim tanlang/.test(document.body.innerText),
    cards: [...document.querySelectorAll('button')].filter(b => /\d+ ta/.test(b.innerText)).length,
    list: document.querySelectorAll('button[style*="content-visibility"]').length
  }));
  check("Do'konlar papka ko'rinishida ochiladi",
    folders.chooser && folders.cards >= 6 && folders.list === 0,
    `papkalar ${folders.cards}, ro'yxat ${folders.list}`);


  /* Toifa papkalari 3D ikonka bilan: oltalasi ham yuklanishi shart.
     Ilgari bu yerda bir xil ingichka chiziqlar turardi. */
  const catIcons = await page.evaluate(async () => {
    const urls = [...document.querySelectorAll('main div')]
      .map(d => (d.style.backgroundImage || '').match(/icons\/(dok-[a-z]+)\.webp/))
      .filter(Boolean).map(m => m[1]);
    const uniq = [...new Set(urls)];
    const ok = await Promise.all(uniq.map(u => new Promise(res => {
      const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false);
      im.src = 'icons/' + u + '.webp';
    })));
    return { uniq, loaded: ok.filter(Boolean).length };
  });
  check("do'kon papkalarida 3D ikonka",
    catIcons.uniq.length === 6 && catIcons.loaded === 6,
    `${catIcons.uniq.length} ta ikonka, ${catIcons.loaded} tasi yuklandi`);


  /* --- Shaxsiy iz: sevimlilar, yaqinda ko'rilgan, qidiruv tarixi ---
     Uchalasi ham shu brauzerda saqlanadi va bo'sh bo'lsa chizilmaydi. */
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(500);
  const bosh0 = await page.evaluate(() => {
    const saq = JSON.parse(localStorage.getItem('xy_state_v1') || '{}');
    return {
      favs: (saq.favs || []).length, searches: (saq.searches || []).length,
      favBlok: /Sevimlilar/.test(document.body.innerText)
    };
  });
  check('bo\'sh shaxsiy bloklar chizilmaydi',
    bosh0.favs === 0 && bosh0.searches === 0 && !bosh0.favBlok,
    JSON.stringify(bosh0));

  /* Kurs bloki: har kirganda o'zgaradigan yagona raqam. */
  const kurs = await page.evaluate(() => {
    const b = [...document.querySelectorAll('main button')]
      .find(x => /so'm \/ 1 USD/.test(x.innerText));
    if (!b) return null;
    const yirik = [...b.querySelectorAll('span')]
      .find(x => x.children.length === 0 && /^[\d\s\u00a0]+$/.test(x.textContent.trim()) &&
                 parseFloat(getComputedStyle(x).fontSize) >= 16);
    return { bor: true, son: yirik ? yirik.textContent.trim() : '',
      manba: /Markaziy bank|zaxira/.test(b.innerText) };
  });
  check('bosh sahifada kurs bloki',
    kurs && kurs.son.replace(/\D/g, '').length >= 4 && kurs.manba,
    kurs ? `${kurs.son} · manba ${kurs.manba}` : 'blok topilmadi');

  /* Bosh sahifadagi kartochkalarda son kulrang izohda emas, yirik raqamda. */
  const yirikSon = await page.evaluate(() => {
    const kart = [...document.querySelectorAll('main button')]
      .filter(b => b.querySelector('img[src*="-3d.webp"]') && b.querySelector('h2'));
    return kart.map(b => {
      const big = [...b.querySelectorAll('span')]
        .filter(x => x.children.length === 0 && parseFloat(getComputedStyle(x).fontSize) >= 22);
      return { nom: b.querySelector('h2').textContent.trim(), son: big.length ? big[0].textContent.trim() : '' };
    });
  });
  check('bosh kartochkalarda raqam yirik',
    yirikSon.length === 4 && yirikSon.every(x => /\d/.test(x.son)),
    yirikSon.map(x => x.nom + ':' + x.son).join(' · '));

  /* Qidiruv orqali do'kon ochilsa: so'rov tarixga, do'kon "yaqinda"ga tushadi. */
  await page.locator('button[aria-label="Qidirish"]').first().click();
  await page.waitForTimeout(600);
  await page.locator('main input[type=search]').first().fill('taobao');
  await page.waitForTimeout(600);
  await page.locator('main button').filter({ hasText: 'Taobao' }).first().click();
  await page.waitForTimeout(900);
  const yulduz = page.locator('button[aria-label*="Sevimlilarga"]').first();
  const yulduzBor = await yulduz.count();
  if (yulduzBor) { await yulduz.click(); await page.waitForTimeout(500); }
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(800);
  const iz = await page.evaluate(() => {
    const saqlangan = JSON.parse(localStorage.getItem('xy_state_v1') || '{}');
    const t = document.body.innerText;
    return {
      favs: saqlangan.favs || [], searches: saqlangan.searches || [], recent: saqlangan.recent || [],
      favBlok: /Sevimlilar/.test(t),
      /* Sevimlida turgani "yaqinda" tasmasida takrorlanmasin — shuning
         uchun butun sahifa matniga emas, aynan tasmalar ichiga qaraymiz. */
      ...(() => {
        const h = [...document.querySelectorAll('main h2')]
          .find(x => x.textContent.trim() === 'Sevimlilar');
        const el = h && [...h.closest('div').parentElement.children]
          .find(d => d.style && d.style.overflowX === 'auto');
        /* Do'kon "Taobao" va qo'llanma "Taobao" bir xil nomlanadi, shuning
           uchun nomga emas, nom + tur satriga qaraymiz. */
        return { favNom: el
          ? [...el.children].map(b => b.innerText.split('\n').slice(0, 2).map(x => x.trim()).join(' | ')) : [] };
      })()
    };
  });
  check('sevimli va qidiruv tarixi yoziladi',
    yulduzBor === 1 && iz.favs.includes('store:taobao') && iz.searches.includes('taobao') &&
    iz.favBlok && iz.favNom.some(x => /^Taobao \| Do'kon/.test(x)),
    `sevimli [${iz.favNom.join()}] · tarix ${iz.searches.join()}`);

  /* Yulduzchani qayta bosganda sevimlidan chiqadi va blok yo'qoladi.
     hasText registrga sezgir emas, shuning uchun oddiy 'Taobao' qidiruv
     tarixidagi "taobao" chipiga ham tushadi — kartochkani tur satri
     bilan birga qidiramiz. */
  await page.locator('main button').filter({ hasText: /Taobao[\s\S]*Do'kon/ }).first().click();
  await page.waitForTimeout(800);
  await page.locator('button[aria-label*="olib tashlash"]').first().click();
  await page.waitForTimeout(500);
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(800);
  const ochirildi = await page.evaluate(() => ({
    favs: (JSON.parse(localStorage.getItem('xy_state_v1') || '{}').favs) || [],
    favBlok: /Sevimlilar/.test(document.body.innerText)
  }));
  check('sevimlidan olib tashlanadi',
    ochirildi.favs.length === 0 && !ochirildi.favBlok,
    `${ochirildi.favs.length} ta qoldi, blok ${ochirildi.favBlok}`);

  /* --- Audit tuzatishlari qaytib kelmasin --- */

  /* Buzuq yoki eski reja ilovani yiqitmasin: ilgari maydoni yetishmagan
     reja `total.toFixed` da TypeError berardi. */
  const buzuq = await page.evaluate(async () => {
    const oldRaw = localStorage.getItem('xy_state_v1');
    const st = JSON.parse(oldRaw || '{}');
    st.plans = [{ id: 'pX' }, { id: 'pY', step: 99, total: null, kg: 'x', price: undefined }];
    localStorage.setItem('xy_state_v1', JSON.stringify(st));
    return oldRaw;
  });
  const xato = [];
  page.on('pageerror', e => xato.push(e.message));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const tikladi = await page.evaluate(() => ({
    bor: !!document.querySelector('main'),
    reja: /Mening rejalarim/.test(document.body.innerText)
  }));
  check('buzuq reja ilovani yiqitmaydi',
    tikladi.bor && tikladi.reja && xato.length === 0,
    xato[0] ? xato[0].slice(0, 70) : JSON.stringify(tikladi));
  /* Filtr va sozlamalar ham: massiv o'rniga satr, noma'lum saralash
     kaliti, noto'g'ri til. Ilgari `storeCountries.join is not a function`
     bilan ilova umuman ochilmasdi. */
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('xy_state_v1') || '{}');
    Object.assign(st, { v: 1, sort: 42, storeCountries: 'x', storeCats: { a: 1 }, courierCountries: [1, null],
      courierMode: {}, storeFolderBy: 9, lang: 'xx', lastTab: 'zzz', trackNo: { n: 1 } });
    localStorage.setItem('xy_state_v1', JSON.stringify(st));
  });
  xato.length = 0;
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const filtrTikladi = await page.evaluate(() => ({ nav: !!document.querySelector('nav'), main: !!document.querySelector('main') }));
  check('buzuq filtr holati ilovani yiqitmaydi',
    filtrTikladi.nav && filtrTikladi.main && xato.length === 0,
    xato[0] ? xato[0].slice(0, 70) : JSON.stringify(filtrTikladi));
  await page.evaluate(v => { if (v) localStorage.setItem('xy_state_v1', v); }, buzuq);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1400);

  /* Matn kontrasti: 11-13px li ikkilamchi yozuvlar WCAG AA (4.5:1) dan
     past bo'lmasin. Ilgari ikkilamchi kulrang 2.9-3.2 edi. */
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(500);
  const kontrast = await page.evaluate(() => {
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const parse = t => { const m = t.match(/rgba?\(([^)]+)\)/); if (!m) return null;
      const a = m[1].split(',').map(Number); return { c: a.slice(0, 3), a: a.length > 3 ? a[3] : 1 }; };
    /* Gradient fonli blokda haqiqiy fon rangini o'lchab bo'lmaydi — ular
       chetlab o'tiladi (oq matn siyohrang gradient ustida turadi). */
    const gradient = el => { let n = el;
      while (n && n !== document.body) { if (getComputedStyle(n).backgroundImage !== 'none') return true; n = n.parentElement; }
      return false; };
    const bgOf = el => { let n = el;
      while (n && n !== document.documentElement) { const b = parse(getComputedStyle(n).backgroundColor);
        if (b && b.a > 0.85) return b.c; n = n.parentElement; }
      return [242, 241, 248]; };
    const yomon = [];
    for (const el of document.querySelectorAll('main *')) {
      if (el.children.length) continue;
      const t = (el.textContent || '').trim(); if (t.length < 3) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      if (gradient(el)) continue;
      const cs = getComputedStyle(el), fg = parse(cs.color); if (!fg) continue;
      const L1 = lum(fg.c), L2 = lum(bgOf(el));
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const px = parseFloat(cs.fontSize), wt = parseInt(cs.fontWeight) || 400;
      const need = (px >= 24 || (px >= 18.66 && wt >= 700)) ? 3 : 4.5;
      if (ratio < need) yomon.push(t.slice(0, 26) + ' ' + ratio.toFixed(2));
    }
    return [...new Set(yomon)];
  });
  check('matn kontrasti AA darajasida', kontrast.length === 0, kontrast.slice(0, 4).join(' | '));

  /* Pastki menyu `main` dan tashqarida, shuning uchun yuqoridagi tekshiruv
     uni ko'rmaydi. Nofaol yozuvlar #8E8DA8 da 3.22:1 edi. */
  const menyuKontrast = await page.evaluate(() => {
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const rgb = t => (t.match(/rgba?\(([^)]+)\)/) || [0, '255,255,255'])[1].split(',').map(Number);
    const yomon = [];
    for (const b of document.querySelectorAll('nav button')) {
      for (const el of b.querySelectorAll('*')) {
        const t = (el.textContent || '').trim();
        if (!t || el.children.length) continue;
        const L1 = lum(rgb(getComputedStyle(el).color)), L2 = lum([255, 255, 255]);
        const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (r < 4.5) yomon.push(t + ' ' + r.toFixed(2));
      }
    }
    return yomon;
  });
  check('pastki menyu kontrasti AA', menyuKontrast.length === 0, menyuKontrast.join(', '));

  /* Manbadagi apostrof bitta xil bo'lsin (ASCII '). Ilgari o'/g' uchun
     ‘ (U+2018) ham ishlatilgan edi — qidiruv va tarjimaga xalaqit beradi. */
  const egri = [...src.matchAll(/[\u2018\u2019\u02BB\u02BC]/g)].length;
  check('apostrof bir xil', egri === 0, egri ? egri + ' ta egri apostrof' : '');

  /* Ikonka shkalasi: to'rt o'lcham, har birida chiziq ekranda ~1.6px.
     viewBox hamma joyda 24, ya'ni ko'rinadigan qalinlik = sw * o'lcham / 24.
     Ilgari 9 o'lcham va 6 qalinlik bor edi, chiziq 1.28-2.66px orasida edi. */
  const IKON = { 14: '2.7', 18: '2.1', 22: '1.75', 28: '1.4' };
  const yomonIkon = [];
  for (const m of src.matchAll(/<svg\s[^>]*width="(\d+)"[^>]*>/g)) {
    const w = +m[1];
    if (!IKON[w]) { yomonIkon.push(w + 'px o\'lcham'); continue; }
    const sw = /stroke-width="([0-9.]+)"/.exec(m[0]);
    if (sw && sw[1] !== IKON[w]) yomonIkon.push(`${w}px -> sw ${sw[1]}, kerak ${IKON[w]}`);
  }
  /* Tab ikonkalari qalinlikni JS dan oladi. */
  for (const m of src.matchAll(/sw: '([0-9.]+)'/g))
    if (m[1] !== '1.75') yomonIkon.push('tab sw ' + m[1]);
  check('chiziqli ikonkalar bitta shkalada', yomonIkon.length === 0,
    [...new Set(yomonIkon)].slice(0, 5).join(' | '));

  /* Matn tizimi: kegl shkalasi 11/13/15/17/22/26/34 (44 va 52 — bayroq
     glifi), har bir keglda ko'pi bilan ikki qalinlik, harf oralig'i esa
     px emas em (11-15px uchun body dagi umumiy qoida yetadi). Ilgari
     brauzerda 52 xil kombinatsiya chiqar edi, ularning 22 tasi bir martalik. */
  const KEGL = { 11: [600, 700], 13: [500, 700], 15: [500, 700], 17: [700],
    22: [800], 26: [800], 34: [800] };
  const yomonMatn = [];
  for (const m of src.matchAll(/style="([^"]*font-size:(\d+)px[^"]*)"/g)) {
    const [style, fs] = [m[1], +m[2]];
    if (fs === 44 || fs === 52) continue;          // bayroq glifi
    if (!KEGL[fs]) { yomonMatn.push(fs + 'px kegl shkalada yo\'q'); continue; }
    const w = /font-weight:(\d+)/.exec(style);
    if (w && !KEGL[fs].includes(+w[1])) yomonMatn.push(`${fs}px/${w[1]}`);
    const ls = /letter-spacing:(-?[\d.]+)px/.exec(style);
    if (ls && ls[1] !== '2') yomonMatn.push(`${fs}px letter-spacing ${ls[1]}px`);
  }
  check('matn shkalasi bir xil', yomonMatn.length === 0,
    [...new Set(yomonMatn)].slice(0, 6).join(' | '));

  /* Masofa shkalasi: padding/gap/margin faqat juft qadamlarda.
     Ilgari 88 xil padding bor edi, ichida 5, 7, 9, 11, 13, 15, 17px. */
  const QADAM = new Set([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32]);
  const yomonMasofa = new Set();
  for (const m of src.matchAll(/[^-](?:padding|gap|margin):\s*([^;"']+)/g)) {
    const v = m[1].trim();
    if (/calc|var|%|em|!important/.test(v)) continue;
    for (const t of v.split(/\s+/)) {
      const mm = /^(\d+)px$|^(0)$/.exec(t);
      if (!mm) continue;
      const n = +(mm[1] ?? mm[2]);
      if (n <= 32 && !QADAM.has(n)) yomonMasofa.add(n + 'px');
    }
  }
  check('masofa shkalasi juft qadamlarda', yomonMasofa.size === 0, [...yomonMasofa].join(' '));

  /* Soya: bir nechta tayyor qatlamdan yig'iladi. Ilgari 41 xil e'lon,
     ko'pi bir martadan farq qiladigan qiymatlar edi. */
  const qatlam = new Set();
  for (const m of src.matchAll(/box-shadow:\s*([^;"']+)/g)) {
    const v = m[1].trim();
    if (v === 'none' || v.includes('{{')) continue;
    for (const l of v.replace('!important', '').split(/,(?![^()]*\))/))
      if (l.trim()) qatlam.add(l.trim());
  }
  check('soya qatlamlari sanoqli', qatlam.size <= 18, qatlam.size + ' xil');

  /* Rang tizimi: do'kon/kuryer brend ranglaridan tashqari hamma rang
     logotipning ko'k oilasida (ton 238) bo'lsin va soni cheklangan.
     Ilgari 150 ta rang bor edi, 77 tasi bir martadan; asosiy rang esa
     binafsha (ton 246) bo'lib, logotip va 3D rasmlardan ajralib turardi. */
  const brendRang = new Set([...src.matchAll(/color:\s*"(#[0-9A-Fa-f]{6})"/g)]
    .map(m => m[1].toUpperCase()));
  const dizaynRang = [...new Set((src.match(/#[0-9A-Fa-f]{6}/g) || []).map(h => h.toUpperCase()))]
    .filter(h => !brendRang.has(h));
  const binafsha = dizaynRang.filter(h => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn < 0.06) return false;
    let hue;
    if (mx === r) hue = 60 * (((g - b) / (mx - mn)) % 6);
    else if (mx === g) hue = 60 * ((b - r) / (mx - mn) + 2);
    else hue = 60 * ((r - g) / (mx - mn) + 4);
    if (hue < 0) hue += 360;
    return hue > 240.5 && hue < 256;
  });
  check('ranglar soni cheklangan', dizaynRang.length <= 80, dizaynRang.length + ' ta');
  check('binafsha qoldig\'i yo\'q', binafsha.length === 0, binafsha.slice(0, 6).join(' '));

  /* Rasm uyalari ham shkalada: 3D ikonkalar 42, 44, 46, 52, 58, 62, 64 px
     kabi yetti xil o'lchamda chizilar edi. */
  const UYA = new Set([16, 24, 32, 40, 48, 64]);
  const yomonUya = new Set();
  for (const m of src.matchAll(/style="([^"]*width:(\d+)px;height:\2px[^"]*)"/g)) {
    const st = m[1];
    if (st.includes('brand')) continue;
    if (!st.includes('icons/') && !/\bpic\s*\}\}/.test(st)) continue;
    if (!UYA.has(+m[2])) yomonUya.add(m[2] + 'px');
  }
  for (const m of src.matchAll(/<img src="icons\/([^"]+)"[^>]*width="(\d+)"/g))
    if (!m[1].startsWith('brand') && !UYA.has(+m[2])) yomonUya.add(m[2] + 'px');
  check('rasm uyalari shkalada', yomonUya.size === 0, [...yomonUya].join(' '));

  /* Ruscha va kirill rejimida o'zbekcha lotin matn qolib ketmasin.
     Bitta yurish ikkala til uchun: bosh sahifadan tashqari qidiruv,
     kuzatuv, do'kon va kuryer papkalari, do'kon/kuryer sahifasi,
     taqqoslash, bojxonaning oltita bo'limi, sozlamalar va xizmatlar.
     Ilgari faqat beshta bo'lim tekshirilar edi va chuqur ekranlarda
     200 dan ortiq satr tarjimasiz turardi.
     Ruscha rejimda ma'lumotlar bazasidan kelgan matn (kuryer izohi, tarif,
     do'kon tavsifi) ataylab o'zbekcha — u lang="uz" bilan belgilangan va
     o'tkazib yuboriladi. Kirill rejimida esa hammasi o'giriladi, faqat
     brend nomlari, manzillar va valyuta kodlari lotin qoladi. */
  const BREND = new RegExp('^(' + [...new Set([
    ...[...src.matchAll(/\{"id":"[a-z0-9]+","name":"([^"]+)"/g)].map(m => m[1]),
    ...[...src.matchAll(/^\s*\{ id:'[a-z0-9]+', name:'([^']+)'/gm)].map(m => m[1]),
    ...[...src.matchAll(/name\s*:\s*['"]([^'"\\]+)['"]/g)].map(m => m[1]).filter(x => /^[A-Z]/.test(x) && x.length < 24),
    ...[...src.matchAll(/title:'([^']+)', flag:/g)].map(m => m[1])
  ])].map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')');
  const ATAYLAB = /^(O'zbekcha|Ўзбекча|Русский|VMQ|BHM|SALES TAX|Telegram|Instagram|App Store|Google Play|v\d|USD|EUR|GBP|iOS|Android|Nike|Adidas|Puma|Apple|Samsung|Xiaomi|Lenovo|Tmall|Walmart|Noon|AliExpress|Buy for me|Door delivery|Marketplace|Tracking|Powerbank|Black Friday|Pochtam|[\w.+-]+@[\w.-]+|[\w-]+\.(uz|com|ru|org)(\/|$))/i;
  const tarjimaSkan = async (lang) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    /* Tirik kurs holati ham skanerlansin: CI da cbu.uz ochiq, lokalda yopiq
       bo'lishi mumkin — ikkalasida ham bir xil natija uchun javob soxta. */
    await ctx.route('**cbu.uz/**', r => r.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([{ Rate: '12650.00', Date: '09.09.2026', Diff: '0.50' }]) }));
    const p = await ctx.newPage();
    await p.goto(base + '/', { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    const tanla = p.getByText(lang === 'ru' ? 'Русский' : 'Ўзбекча', { exact: true }).first();
    if (await tanla.count()) { await tanla.click(); await p.waitForTimeout(500); }
    for (let i = 0; i < 2; i++) {
      const sk = p.getByRole('button', { name: /O'tkazib yuborish|Пропустить|Ўтказиб/ });
      if (await sk.count()) { await sk.first().click(); await p.waitForTimeout(350); }
    }
    await p.waitForTimeout(500);
    const qoldi = [];
    const skan = async (nom) => {
      await p.waitForTimeout(450);
      const bu = await p.evaluate((lang) => {
        const out = [];
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
          const s = n.textContent.trim();
          if (s.length < 4 || s.length > 200) continue;
          const el = n.parentElement;
          if (!el || !el.getBoundingClientRect().width) continue;
          if (lang === 'ru' && el.closest('[lang^="uz"]')) continue;
          if (/[А-Яа-яЀ-ӿ]/.test(s)) continue;
          if (!/[a-z]{3}/.test(s)) continue;
          out.push(s);
        }
        return [...new Set(out)];
      }, lang);
      bu.forEach(t => qoldi.push(nom + ': ' + t));
    };
    const nav = async (i) => { await p.locator('nav button').nth(i).click(); await p.waitForTimeout(500); };
    const bos = async (re) => { const l = p.locator('main button').filter({ hasText: re }).first(); if (await l.count()) { await l.click(); await p.waitForTimeout(600); return true; } return false; };
    await skan('bosh');
    await p.locator('header button').first().click(); await p.waitForTimeout(400);
    await p.locator('input').first().fill('nike'); await skan('qidiruv');
    await p.locator('input').first().fill('zzqq'); await skan('qidiruv-bo\'sh');
    await nav(0); await p.locator('header button').nth(1).click(); await skan('kuzatuv');
    await nav(0); await bos(/Do'konlar|Дўконлар|Магазины/); await skan('do\'kon-papkalar');
    await bos(/Universal|Универсал/); await skan('do\'kon-papka');
    await bos(/Taobao/); await skan('do\'kon');
    await nav(0); await bos(/Kuryerlar|Курьерлар|Курьеры/); await skan('kuryer-papkalar');
    await bos(/Turkiya|Туркия|Турция/); await skan('kuryer-papka');
    await bos(/ASE/); await skan('kuryer');
    await bos(/Taqqoslash|Таққослаш|Сравн/); await skan('taqqoslash');
    for (let i = 0; i < 6; i++) {
      await nav(3); await p.waitForTimeout(300);
      const secs = p.locator('main button').filter({ hasText: /Bojsiz|Yagona|Taqiqlangan|Rasmiylashtirish|kalkulyatori|organlari|Божсиз|Ягона|Тақиқланган|Расмийлаштириш|калькулятор|органлари|Беспошлин|Единый|Запрещ|Оформлен|калькулятор|органы/i });
      if (await secs.count() > i) { await secs.nth(i).click(); await p.waitForTimeout(600); await skan('bojxona-' + i); }
    }
    await nav(1); await skan('qo\'llanmalar');
    await nav(2); await skan('reja');
    await nav(4); await skan('sozlamalar');
    await nav(0); await bos(/Mutaxassis|Мутахассис|Помощь|консульт/); await skan('xizmatlar');
    await bos(/Kuryer tashkilotiman|Курьер ташкилотиман|Я курьерская/); await skan('xizmatlar-kuryer');
    await ctx.close();
    return [...new Set(qoldi)].filter(t => { const m = t.slice(t.indexOf(': ') + 2); return !ATAYLAB.test(m) && !BREND.test(m); });
  };
  const ruYomon = await tarjimaSkan('ru');
  check('ruscha rejimda tarjimasiz matn yo\'q', ruYomon.length === 0, ruYomon.slice(0, 4).join(' | '));
  const uzcYomon = await tarjimaSkan('uzc');
  check('kirill rejimida lotin matn yo\'q', uzcYomon.length === 0, uzcYomon.slice(0, 4).join(' | '));

  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(600);

  /* Do'kon ro'yxatidagi yorliqlar faqat ogohlantirish bo'lib qolmasin:
     qo'llanmasi bor do'konlarda ijobiy belgi turadi. */
  await page.locator('main button', { hasText: "Do'konlar" }).first().click();
  await page.waitForTimeout(600);
  await page.locator('main button', { hasText: 'Universal' }).first().click();
  await page.waitForTimeout(700);
  const qollanmaBelgi = await page.evaluate(() => {
    const kart = [...document.querySelectorAll('main button')].filter(b => /Sotuvchiga|Original|Buyurtma|VPN/.test(b.innerText));
    return { jami: kart.length, belgili: kart.filter(b => /Qo'llanma bor/.test(b.innerText)).length };
  });
  check("do'kon ro'yxatida qo'llanma belgisi",
    qollanmaBelgi.belgili >= 3 && qollanmaBelgi.belgili < qollanmaBelgi.jami,
    `${qollanmaBelgi.belgili}/${qollanmaBelgi.jami} do'konda`);

  /* Taqqoslash rejimi yoqilganda nima qilish kerakligi yozilib turadi. */
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(500);
  await page.locator('main button', { hasText: 'Kuryerlar' }).first().click();
  await page.waitForTimeout(700);
  await page.locator('main button', { hasText: 'AQSh' }).first().click();
  await page.waitForTimeout(700);
  const cmpOldin = await page.evaluate(() => /belgilang/.test(document.querySelector('main').innerText));
  await page.locator('main button', { hasText: 'Taqqoslash' }).first().click();
  await page.waitForTimeout(500);
  const cmpKeyin = await page.evaluate(() => /belgilang/.test(document.querySelector('main').innerText));
  check('taqqoslash rejimida yo\'riqnoma chiqadi', !cmpOldin && cmpKeyin,
    `oldin ${cmpOldin}, keyin ${cmpKeyin}`);

  /* Taqqoslash rejimi papkaga tegishli: boshqa papkada qolib ketmaydi. */
  await page.locator('button[aria-label="Orqaga qaytish"]').first().click();
  await page.waitForTimeout(500);
  await page.locator('main button', { hasText: 'Turkiya' }).first().click();
  await page.waitForTimeout(700);
  const cmpBoshqa = await page.evaluate(() => /belgilang/.test(document.querySelector('main').innerText));
  check('taqqoslash rejimi boshqa papkaga o\'tmaydi', !cmpBoshqa);

  /* Kuryer papkasidagi filtr varag'i kuryer filtrlarini ko'rsatadi (ilgari
     do'kon filtrlari chiqardi), yo'nalish papkasida davlat so'ralmaydi,
     Escape esa ekranni emas, varaqni yopadi. */
  await page.locator('header button').last().click();
  await page.waitForTimeout(400);
  const varaq = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  check('kuryer papkasida kuryer filtri, davlatsiz',
    /Yuborish turi/.test(varaq) && /Saralash/.test(varaq) && !/Qaysi davlatdan/.test(varaq) && !/Kategoriya/.test(varaq),
    (varaq.match(/Filtr (.{0,80})/) || [])[1]);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const escHolat = await page.evaluate(() => ({
    varaq: /Natijani ko'rish/.test(document.body.innerText),
    sarlavha: document.querySelector('header').innerText.replace(/\s+/g, ' ').trim()
  }));
  check('Escape filtr varag\'ini yopadi, ekran qoladi',
    !escHolat.varaq && /Turkiya/.test(escHolat.sarlavha), JSON.stringify(escHolat));

  /* Do'kon sahifasidan "N kuryerni ko'rish" to'g'ri yo'nalish papkasini
     ochadi; Global do'kon uchun "Barcha kuryerlar". */
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(500);
  await page.locator('main button', { hasText: "Do'konlar" }).first().click();
  await page.waitForTimeout(600);
  await page.locator('main button', { hasText: 'Tovar turi' }).first().click();
  await page.waitForTimeout(300);
  await page.locator('main button', { hasText: 'Universal' }).first().click();
  await page.waitForTimeout(600);
  await page.locator('main button', { hasText: 'Taobao' }).first().click();
  await page.waitForTimeout(700);
  await page.locator('main button', { hasText: "kuryerni ko'rish" }).first().click();
  await page.waitForTimeout(700);
  const taobaoKur = await page.evaluate(() => document.querySelector('header').innerText.replace(/\s+/g, ' ').trim());
  check('do\'kondan kuryerlarga: Taobao -> Xitoy yo\'nalishi', /Xitoy yo'nalishi/.test(taobaoKur), taobaoKur);

  /* Brend introsi: har ochilishda o'ynaydi, ilova ortda ko'tariladi,
     ~3 soniyada o'zi ketadi. Harakatni kamaytirish yoqilgan bo'lsa
     umuman ko'rsatilmaydi. */
  const introCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const introPage = await introCtx.newPage();
  await introPage.goto(base + '/', { waitUntil: 'commit' });
  await introPage.waitForTimeout(900);
  const introBor = await introPage.evaluate(() => {
    const el = document.querySelector('div[aria-hidden="true"][style*="z-index:9999"], div[aria-hidden="true"][style*="z-index: 9999"]');
    return { bor: !!el, rasm: el ? el.querySelectorAll('img').length : 0 };
  });
  check('intro ochilishda chiqadi', introBor.bor && introBor.rasm === 11,
    JSON.stringify(introBor));

  /* Telegram foydalanuvchisining tili ruscha bo'lsa, tanishuv ekrani ruscha
     ochiladi ("Выберите язык"); tanlov baribir foydalanuvchida. */
  const tgCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await tgCtx.addInitScript(() => { window.Telegram = { WebApp: { initData: '', initDataUnsafe: { user: { language_code: 'ru' } }, ready() {}, expand() {}, BackButton: { onClick() {}, show() {}, hide() {} }, colorScheme: 'light', themeParams: {} } }; });
  const tgOnbPage = await tgCtx.newPage();
  await tgOnbPage.goto(base + '/', { waitUntil: 'load' });
  await tgOnbPage.waitForTimeout(900);
  const tgOnb = await tgOnbPage.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 120));
  check('ruscha Telegram foydalanuvchisiga tanishuv ruscha', /Выберите язык/.test(tgOnb), tgOnb);
  await tgCtx.close();
  await introPage.waitForTimeout(2800);
  const introKetdi = await introPage.evaluate(() => ({
    intro: !!document.querySelector('div[aria-hidden="true"][style*="9999"]'),
    ilova: !!document.querySelector('#dc-root')?.firstChild
  }));
  check('intro tugaydi va ilovaga topshiradi', !introKetdi.intro && introKetdi.ilova,
    JSON.stringify(introKetdi));
  await introPage.reload({ waitUntil: 'commit' });
  await introPage.waitForTimeout(900);
  check('intro ikkinchi ochilishda ham chiqadi',
    await introPage.evaluate(() => !!document.querySelector('div[aria-hidden="true"][style*="9999"]')));
  await introCtx.close();

  const rmCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const rmPage = await rmCtx.newPage();
  await rmPage.goto(base + '/', { waitUntil: 'commit' });
  await rmPage.waitForTimeout(900);
  check('harakat kamaytirilganda intro chiqmaydi',
    !(await rmPage.evaluate(() => !!document.querySelector('div[aria-hidden="true"][style*="9999"]'))));
  await rmCtx.close();

  /* Gradient ustidagi yarim shaffof oq matn. Kontrastni piksel bo'yicha
     o'lchab chiqdik: .44 da qadam yozuvlari 3,29:1, .60 da bosh yozuv
     4,02:1 edi — ikkalasi ham 11px matn uchun kerakli 4,5 dan past.
     Hozirgi qiymatlarda 4,96 va 5,46. Shu sabab quyi chegara qo'yiladi. */
  const oqAlfa = [...src.matchAll(/color:rgba\(255,255,255,\.(\d+)\)/g)].map(m => +('.' + m[1]));
  const oqDots = [...src.matchAll(/'rgba\(255,255,255,\.(\d+)\)'/g)].map(m => +('.' + m[1]));
  const past = [...oqAlfa, ...oqDots.filter(a => a > 0.3)].filter(a => a < 0.58);
  check('gradient ustidagi oq matn yetarli qoramtir', past.length === 0,
    past.length ? 'past alfa: ' + past.join(', ') : 'eng pasti ' + Math.min(...oqAlfa, ...oqDots.filter(a => a > 0.3)));

  /* Qidiruv paneli — balandligi 50-52px, ichidagi maydon esa ~22px.
     Qobiq <label> bo'lmasa, qatorning bo'sh joyiga bosilganda hech narsa
     bo'lmaydi. Uchala qidiruvda ham qatorning tepasiga bosib tekshiramiz. */
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(500);
  await page.locator('button[aria-label="Qidirish"]').first().click();
  await page.waitForTimeout(600);
  const qidiruvFokus = await page.evaluate(() => {
    const inp = document.querySelector('main input[type="search"]');
    if (!inp) return 'maydon yo\'q';
    const qator = inp.closest('label');
    if (!qator) return 'qobiq <label> emas';
    const r = qator.getBoundingClientRect();
    return Math.round(r.height) >= 44 ? 'ok ' + Math.round(r.height) + 'px' : 'qator past: ' + Math.round(r.height);
  });
  check('qidiruv qatorining bo\'sh joyi ham maydonni fokuslaydi',
    String(qidiruvFokus).startsWith('ok'), qidiruvFokus);
  await page.locator('button[aria-label="Orqaga qaytish"]').first().click();
  await page.waitForTimeout(500);

  /* Sehrgarda davlat tanlansa avval o'sha davlatning do'konlari, keyin
     "Global" (ko'p davlatga yuboradigan) do'konlar chiqadi — ular umuman
     chiqmasa, "Poyabzal + AQSh" tanlagan odam Nike'ni ko'rmasdi. Xitoyni
     tanlab, ro'yxat Xitoy bilan boshlanib Global bilan tugashini qaraymiz. */
  await page.locator('nav button', { hasText: 'Reja' }).first().click();
  await page.waitForTimeout(700);
  await page.locator('main button').filter({ hasText: 'Elektronika' }).first().click();
  await page.waitForTimeout(600);
  await page.locator('main button').filter({ hasText: 'Xitoy' }).first().click();
  await page.waitForTimeout(700);
  const wizDav = await page.evaluate(() => {
    const kart = [...document.querySelectorAll('main button')]
      .map(b => b.innerText.trim().split('\n').map(x => x.trim()).filter(Boolean))
      .filter(L => L.length >= 2 && /·/.test(L[1]));
    return kart.map(L => L[1].split('·')[1].trim());
  });
  const wizGlobalIdx = wizDav.indexOf('Global');
  check('sehrgarda davlat tanlansa avval o\'sha davlat, keyin Global do\'konlar',
    wizDav.length > 0 && wizDav[0] === 'Xitoy' && wizGlobalIdx > 0 &&
    wizDav.every((x, i) => i < wizGlobalIdx ? x === 'Xitoy' : x === 'Global'),
    wizDav.join(', ') || 'do\'kon topilmadi');
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(500);

  /* Hamkorlik: kuryerlik tashkilotlari ro'yxatga qo'shilish uchun shu
     yerdan yozadi — Telegramga oldindan yozilgan xabar bilan. */
  await page.locator('nav button', { hasText: 'Sozlamalar' }).first().click();
  await page.waitForTimeout(800);
  const hamkor = await page.evaluate(() => {
    const b = [...document.querySelectorAll('main button')]
      .filter(x => /tashkilotiman/.test(x.innerText));
    return { soni: b.length, baland: b.every(x => x.getBoundingClientRect().height >= 44),
      matn: b.map(x => x.innerText.trim()).join(' | ') };
  });
  check('hamkorlik uchun murojaat tugmasi bor', hamkor.soni === 1 && hamkor.baland, hamkor.matn);

  /* O'lchash sukut bo'yicha o'chiq: METRICS_URL bo'sh bo'lsa hodisalar
     to'planmaydi ham, yuborilmaydi ham. Shu sabab "cbu.uz dan boshqa tashqi
     so'rov yo'q" qoidasi buzilmaydi. Manzil to'ldirilsa — u loyihaning o'z
     hisoblagichi bo'lishi kerak, README da yozilgan. */
  check('o\'lchash manzili: bo\'sh yoki o\'z Worker\'imiz',
    METRICS_URL === '' || /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/$/.test(METRICS_URL), METRICS_URL || "bo'sh");
  /* Modul ichkarida, global emas — shuning uchun uni chaqirib emas,
     natijasi bo'yicha tekshiramiz: bir necha ekran aylanib, sahifa fonga
     o'tganda ham hech qanday beacon jo'natilmasin. */
  const beacon = await page.evaluate(async () => {
    let n = 0;
    const asl = navigator.sendBeacon;
    navigator.sendBeacon = function (u) { n++; window.__beaconTo = String(u); return true; };
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    navigator.sendBeacon = asl;
    return n;
  });
  if (!METRICS_URL) check('o\'chiq holatda hech narsa jo\'natilmaydi', beacon === 0, beacon + ' ta beacon');
  else check('o\'lchov faqat o\'z Worker\'imizga ketadi', beacon === 0 || (await page.evaluate(() => window.__beaconTo)) === METRICS_URL,
    beacon + ' ta beacon -> ' + (await page.evaluate(() => window.__beaconTo)));

  /* Kulrang shkala uch pog'onadan iborat: kuchli, passiv, bezak. */
  const kulrang = [...new Set((src.match(/#[0-9A-F]{6}/gi) || []).map(h => h.toUpperCase()))]
    .filter(h => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return mx > 90 && mx < 200 && mx - mn < 40;
    });
  /* Uch pog'ona: #4E4E6B kuchli, #6C6B85 passiv (AA), #A6A6BC bezak. */
  check('kulrang shkalasi uch pog\'ona', kulrang.length <= 3, kulrang.join(' '));

  /* Teginish maydonlari: matn havolalari 17px balandlikda edi. */
  const mayda = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('main button, main a[href]')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.height < 32) out.push((el.innerText || el.getAttribute('aria-label') || '?').trim().slice(0, 24) + ' ' + Math.round(r.height) + 'px');
    }
    return [...new Set(out)];
  });
  check('teginish maydonlari 32px dan kichik emas', mayda.length === 0, mayda.slice(0, 4).join(' | '));

  /* Pullik xizmatlar bo'limi aloqa manziliga bog'langan: CONTACT bo'sh
     bo'lsa bo'lim butunlay ko'rsatilmaydi (aks holda 11 ta "Bog'lanish"
     tugmasi ogohlantirishga olib borardi). To'ldirilgan bo'lsa — ichki
     tuzilishi tekshiriladi. */
  const aloqaBor = /const CONTACT = \{[^}]*tg:\s*'[^']+'/.test(src)
    || /const CONTACT = \{[^}]*phone:\s*'[^']+'/.test(src);
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(500);
  const svcKirish = await page.getByText('Mutaxassis yordami', { exact: false }).count();
  if (!aloqaBor) {
    check('aloqasiz pullik xizmatlar yashiriladi', svcKirish === 0,
      svcKirish + ' ta kirish nuqtasi ko\'rinib turibdi');
  } else {
    await page.getByText('Mutaxassis yordami', { exact: false }).first().click();
    await page.waitForTimeout(700);
    /* Belgilangan narx: xaridor yo'lagida "Kelishilgan holda" qolmasin —
       narx ko'rinsa odam yozadi. Tugma Telegram xabariga narxni qo'shadi. */
    const svcNarx = await page.evaluate(() => {
      const t = document.querySelector('main').innerText;
      return { kelishilgan: /Kelishilgan holda/.test(t), som: (t.match(/\d[\d ]+ so'm/g) || []).length };
    });
    check('xizmatlarda belgilangan narx', !svcNarx.kelishilgan && svcNarx.som >= 5, JSON.stringify(svcNarx));
    const svcShaxs = await page.evaluate(() => {
      const b = [...document.querySelectorAll('main button')].filter(x => x.innerText.trim() === "Bog'lanish");
      const ic = [...document.querySelectorAll('main div')]
        .filter(d => /icons\/svc-/.test(d.style.backgroundImage)).length;
      return { n: b.length, ic };
    });
    await page.getByText('Kuryer tashkilotiman', { exact: false }).first().click();
    await page.waitForTimeout(600);
    const svcTash = await page.evaluate(() =>
      [...document.querySelectorAll('main button')].filter(x => x.innerText.trim() === "Bog'lanish").length);
    check('xizmatlar: xaridor yo\'nalishi', svcShaxs.n === 5 && svcShaxs.ic >= 5,
      `${svcShaxs.n} ta karta, ${svcShaxs.ic} ta ikonka`);
    check('xizmatlar: tashkilot yo\'nalishi', svcTash === 6, `${svcTash} ta karta`);
  }

  /* Kuzatuv: saqlangan reja jo'natmaga aylanadi — trek raqami yoziladi
     va bosqichi qo'lda suriladi. Kuzatuv tugmasi bosh sahifa sarlavhasida. */
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(450);
  await page.locator('button[aria-label*="kuzat"]').first().click();
  await page.waitForTimeout(700);
  const kuzBosh = (await page.evaluate(() => document.body.innerText)).includes('Hali kuzatiladigan');
  check('kuzatuv: bo\'sh holat tushuntiriladi', kuzBosh);

  await page.locator('nav button', { hasText: 'Reja' }).first().click();
  await page.waitForTimeout(600);
  /* Sehrgar oldingi tekshiruvdan keyin o'rtada turibdi — birinchi qadamga
     qaytamiz (nuqtalar aria-label bilan belgilangan). */
  const d1 = page.locator('button[aria-label^="1-qadam"]').first();
  if (await d1.count()) { await d1.click(); await page.waitForTimeout(450); }
  /* Kategoriya qatorlarida emoji emas, ilovaning o'z 3D ikonkalari. */
  const wizIk = await page.evaluate(async () => {
    const btns = [...document.querySelectorAll('main button')]
      .filter(b => /ta do'kon mos keladi/.test(b.innerText));
    const pics = btns.map(b => {
      const d = [...b.querySelectorAll('div')]
        .find(x => /icons\/dok-[a-z]+\.webp/.test(x.style.backgroundImage || ''));
      return d ? d.style.backgroundImage.match(/icons\/dok-[a-z]+\.webp/)[0] : null;
    });
    const uniq = [...new Set(pics.filter(Boolean))];
    const ok = await Promise.all(uniq.map(u => new Promise(r => {
      const im = new Image(); im.onload = () => r(true); im.onerror = () => r(false); im.src = u;
    })));
    return { qator: btns.length, bor: pics.filter(Boolean).length, xil: uniq.length,
      yuklandi: ok.filter(Boolean).length,
      emoji: btns.some(b => /[\u{1F300}-\u{1FAFF}]/u.test(b.innerText)) };
  });
  check('sehrgar 1-qadamida ikonka (emoji emas)',
    wizIk.qator === 6 && wizIk.bor === 6 && wizIk.xil === 6 &&
    wizIk.yuklandi === 6 && !wizIk.emoji,
    `${wizIk.bor}/${wizIk.qator} ikonka, ${wizIk.yuklandi} yuklandi` + (wizIk.emoji ? ', emoji qoldi' : ''));

  await page.locator('button:visible').filter({ hasText: /Elektronika|Kiyim|Poyabzal/ }).first().click();
  await page.waitForTimeout(450);
  await page.locator('button:visible').filter({ hasText: /Xitoy|AQSh|Turkiya/ }).first().click();
  await page.waitForTimeout(550);
  /* Davlat tanlanganda ham ko'p davlatga yuboradigan (Global) do'konlar
     ro'yxatda, lekin o'sha davlatnikidan keyin: "Kiyim + Xitoy" da SHEIN,
     "Poyabzal + AQSh" da Nike ko'rinishi kerak. */
  const wizRo = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('main button')].map(b => b.innerText.replace(/\s+/g, ' ')).filter(t => /vositachi kerak|to'g'ridan-to'g'ri/.test(t));
    return { n: rows.length, birinchi: rows[0] || '', global: rows.filter(t => /· Global ·/.test(t)).length,
      sub: (document.querySelector('main').innerText.match(/Tanlovingizga mos[^\n]*/) || [''])[0] };
  });
  check('rejada Global do\'konlar davlatnikidan keyin chiqadi',
    wizRo.n > 2 && wizRo.global > 0 && !/· Global ·/.test(wizRo.birinchi) && /ko'p davlatga/.test(wizRo.sub),
    `${wizRo.n} ta, ${wizRo.global} global · ${wizRo.sub}`);
  await page.locator('button:visible').filter({ hasText: /Marketplace/ }).first().click();
  await page.waitForTimeout(550);
  const kk = page.locator('main button:visible');
  for (let i = 0; i < await kk.count(); i++) {
    const t = (await kk.nth(i).innerText().catch(() => '')).trim();
    if (/kun|\$/.test(t) && t.length > 6) { await kk.nth(i).click(); break; }
  }
  await page.waitForTimeout(700);
  const kor = page.locator('main button', { hasText: "Rejani ko'rish" });
  if (await kor.count()) { await kor.first().click(); await page.waitForTimeout(600); }
  await page.locator('main button', { hasText: 'Rejani saqlash' }).first().click();
  await page.waitForTimeout(900);

  /* Saqlangandan keyin reja ekrani ochiladi va tepasida yakun turadi —
     ilgari foydalanuvchi bosh sahifaga tashlanardi va nima chiqqanini
     ko'rmasdi. */
  const yakun = await page.evaluate(() => {
    const t = document.body.innerText;
    return { tayyor: /Rejangiz tayyor/.test(t), meyor: /me'yoriga ham qo'shildi/.test(t),
      jami: /TAXMINIY JAMI/.test(t),
      yol: (t.match(/Rejangiz tayyor\n([^\n]+)/) || [])[1] || '' };
  });
  check('reja saqlangach yakun ko\'rinadi',
    yakun.tayyor && yakun.meyor && yakun.jami && yakun.yol.split('·').length >= 3,
    yakun.yol || JSON.stringify(yakun));

  /* Bojxona: "Oy summasini qo'yish" summani kalkulyatorga qo'yib, uni ochadi. */
  await page.locator('nav button', { hasText: 'Bojxona' }).first().click();
  await page.waitForTimeout(500);
  await page.locator('main button', { hasText: "Oy summasini qo'yish" }).first().click();
  await page.waitForTimeout(600);
  const oyKalk = await page.evaluate(() => ({
    sarlavha: document.querySelector('header').innerText.replace(/\s+/g, ' ').trim(),
    narx: (document.querySelector('main input') || {}).value
  }));
  check('oy summasi kalkulyatorni ochadi', /Bojxona kalkulyatori/.test(oyKalk.sarlavha) && +oyKalk.narx > 0, JSON.stringify(oyKalk));
  await page.locator('button[aria-label="Orqaga qaytish"]').first().click();
  await page.waitForTimeout(400);

  /* Reja tabiga qaytganda saqlangan reja ko'rinib turadi — ilgari bo'sh
     sehrgar chiqar va foydalanuvchi rejasini bosh sahifadan qidirardi. */
  await page.locator('nav button', { hasText: 'Reja' }).first().click();
  await page.waitForTimeout(600);
  const rejaTab = await page.evaluate(() => {
    const t = document.querySelector('main').innerText.replace(/\s+/g, ' ');
    return { saq: /Saqlangan rejalar/i.test(t), yangi: /Yangi reja/i.test(t), qadam: /1 \/ 5/.test(t),
      oldin: t.indexOf('Saqlangan rejalar') < t.indexOf('Nimani olmoqchisiz') };
  });
  check('reja tabida saqlangan reja va yangi sehrgar birga',
    rejaTab.saq && rejaTab.yangi && rejaTab.qadam && rejaTab.oldin, JSON.stringify(rejaTab));

  /* Kuzatuv tugmasi bosh sahifa sarlavhasida — avval o'sha yerga qaytamiz. */
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(500);
  await page.locator('button[aria-label*="kuzat"]').first().click();
  await page.waitForTimeout(700);
  await page.locator('main input[placeholder="Trek raqamini yozing"]').first().fill('rb 1234 cn');
  await page.locator('main input[placeholder="Trek raqamini yozing"]').first().blur();
  await page.waitForTimeout(350);
  const nx = page.locator('main button').filter({ hasText: /Buyurtma qilindi/ }).first();
  if (await nx.count()) { await nx.click(); await page.waitForTimeout(600); }
  const kuz = await page.evaluate(() => {
    const inp = document.querySelector('main input[placeholder="Trek raqamini yozing"]');
    const btn = [...document.querySelectorAll('main button')].find(b => /belgilash/.test(b.innerText));
    return { trek: inp ? inp.value : '', holat: /Buyurtma qilindi/.test(document.body.innerText),
      tugma: btn ? btn.innerText.trim() : '' };
  });
  /* Trek raqam bo'shliqsiz saqlanadi (kuryer sayti "RB 1234 CN" ni
     topmaydi); holat tugmasi reja sahifasidagi kabi "… — belgilash". */
  check('kuzatuv: reja jo\'natmaga aylandi',
    kuz.trek === 'RB1234CN' && kuz.holat && /Kuryer omborida — belgilash/.test(kuz.tugma), JSON.stringify(kuz));

  /* Kuryer kartochkasidagi havola chiplarida belgi bo'lsin. */
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(450);
  await page.getByText('Kuryerlar', { exact: false }).first().click();
  await page.waitForTimeout(700);
  await page.getByText('Barcha kuryerlar', { exact: false }).first().click();
  await page.waitForTimeout(700);
  await page.getByText('MYMEEST', { exact: false }).first().click();
  await page.waitForTimeout(800);
  /* Belgi endi <svg> emas, CSS foni: {{ }} ni to'g'ridan-to'g'ri
     <path d> ichiga yozish har yuklanishda brauzer xatosi berardi. */
  const chip = await page.evaluate(() =>
    [...document.querySelectorAll('main a[href^="http"]')]
      .filter(a => /^(Sayt|Telegram|Instagram|iOS|Android)$/.test(a.innerText.trim()))
      .map(a => {
        const bg = ((a.querySelector('div') || {}).style || {}).backgroundImage || '';
        return a.innerText.trim() + ':' +
          (/data:image\/svg\+xml.*%3Cpath/.test(bg) ? 'chiziq'
           : /icons\/app-/.test(bg) ? 'rasm' : 'yo\'q');
      }));
  check('kuryer havolalarida belgilar',
    chip.length === 5 && chip.every(x => !/yo'q$/.test(x)), chip.join(' '));

  /* Bosiladigan har bir element ko'rinib tursin (yuza, ramka yoki
     strelka) va bosilganda javob bersin. */
  const tap = await page.evaluate(() => {
    const yalang = [];
    for (const el of document.querySelectorAll('main button, main a.xy-tap')) {
      if (el.closest('nav')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 30 || r.height < 24) continue;
      const c = getComputedStyle(el);
      const bor = c.boxShadow !== 'none' || c.borderTopWidth !== '0px'
        || (c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'transparent')
        || c.backgroundImage !== 'none'
        || !!el.querySelector('svg path[d^="M9 18l6-6"], svg path[d^="M6 9l6 6"], svg path[d*="17L17 7"], svg path[d^="M5 12h13"]');
      /* Kartochka ichidagi shaffof bosish sohasi o'zi ko'rinmasligi
         mumkin — uni kartochkaning yuzasi ajratib turadi. */
      const ota = el.parentElement && el.parentElement.closest('div');
      const otaKor = ota && (() => { const o = getComputedStyle(ota);
        return o.boxShadow !== 'none' || o.borderTopWidth !== '0px'
          || (o.backgroundColor !== 'rgba(0, 0, 0, 0)' && o.backgroundColor !== 'transparent'); })();
      if (!bor && !otaKor) yalang.push((el.innerText || '').trim().slice(0, 30));
    }
    const st = [...document.styleSheets].some(ss => { try {
      return [...ss.cssRules].some(r => r.cssText && r.cssText.includes('.xy-tap:active'));
    } catch (e) { return false; } });
    return { yalang, qoida: st };
  });
  check('bosiladigan elementlar ajralib turadi',
    tap.yalang.length === 0 && tap.qoida, tap.yalang.join(' | ') || (tap.qoida ? '' : 'bosish effekti yo\'q'));

  /* Bojxona ma'lumotnomasi bir xil oq qatorlar emas: bitta katta kartochka
     (bojsiz me'yor, raqami yirik) va mavzu ohangi bilan ajratilgan 2x2 plitka. */
  await page.locator('nav button', { hasText: 'Bojxona' }).first().click();
  await page.waitForTimeout(700);
  const ritm = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('main button')];
    const hero = btns.find(b => /BOJSIZ OLIB KIRISH/i.test(b.innerText));
    const grid = [...document.querySelectorAll('main div')]
      .find(d => /repeat\(2|1fr\) minmax/.test(d.style.gridTemplateColumns || '') &&
                 d.querySelectorAll(':scope > button').length === 4);
    const plita = grid ? [...grid.querySelectorAll(':scope > button')] : [];
    /* Kartochka oq: ohang faqat ikonka ostidagi kvadratda turadi,
       shuning uchun rang-baranglikni shu kvadratlardan o'lchaymiz. */
    const fon = plita.map(b => {
      const plate = [...b.querySelectorAll('div')]
        .find(d => /^4[0-9]px$/.test(d.style.width) && d.querySelector('img'));
      return plate ? getComputedStyle(plate).backgroundColor : getComputedStyle(b).backgroundImage;
    });
    const katta = hero ? [...hero.querySelectorAll('span')]
      .some(x => parseFloat(getComputedStyle(x).fontSize) >= 30 && /^\$\d/.test(x.textContent.trim())) : false;
    return {
      hero: !!hero, heroH: hero ? Math.round(hero.getBoundingClientRect().height) : 0,
      katta, plita: plita.length,
      plitaH: plita.length ? Math.round(plita[0].getBoundingClientRect().height) : 0,
      xilFon: new Set(fon).size
    };
  });
  check('bojxona ma\'lumotnomasi bir xil emas',
    ritm.hero && ritm.katta && ritm.plita === 4 && ritm.xilFon === 4 && ritm.heroH > ritm.plitaH * 0.6,
    `katta ${ritm.heroH}px, 4 plitka ${ritm.plitaH}px, ${ritm.xilFon} xil fon`);

  /* Bojxona me'yorlari: kartochkalarda belgilar bo'lsin. */
  await page.locator('nav button', { hasText: 'Bojxona' }).first().click();
  await page.waitForTimeout(600);
  await page.getByText("Bojsiz olib kirish me'yori", { exact: false }).first().click();
  await page.waitForTimeout(800);
  const nrm = await page.evaluate(async () => {
    const u = [...document.querySelectorAll('main div')]
      .map(d => (d.style.backgroundImage || '').match(/icons\/norm\/([a-z]+)\.webp/))
      .filter(Boolean).map(m => m[1]);
    const uniq = [...new Set(u)];
    const ok = await Promise.all(uniq.map(x => new Promise(r => {
      const im = new Image(); im.onload = () => r(true); im.onerror = () => r(false);
      im.src = 'icons/norm/' + x + '.webp';
    })));
    return { xil: uniq.join(','), yuklandi: ok.filter(Boolean).length, soni: uniq.length };
  });
  check("me'yor kartochkalarida belgilar",
    nrm.soni >= 3 && nrm.yuklandi === nrm.soni, `${nrm.xil} (${nrm.yuklandi}/${nrm.soni})`);

  /* Bog'lanish: to'liq raqam bosiladigan bo'lsin, ichki nomerlar emas. */
  await page.locator('button[aria-label="Orqaga qaytish"]').first().click();
  await page.waitForTimeout(600);
  await page.getByText('Bojxona organlari', { exact: false }).first().click();
  await page.waitForTimeout(800);
  const aloqa = await page.evaluate(() => ({
    tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
    ichki: /44-11/.test(document.body.innerText),
    xarita: [...document.querySelectorAll('a')].filter(a => /Xaritada/.test(a.innerText) && a.querySelector('svg')).length
  }));
  /* Manzil, e-pochta va ichki raqamlarni qo'lda ko'chirib yozish xatoga
     olib keladi — bosilganda buferga tushsin. */
  const nusxa = await page.evaluate(async () => {
    const btn = [...document.querySelectorAll('main button')];
    const manzil = btn.find(x => /Manzilni nusxalash/.test(x.getAttribute('aria-label') || ''));
    const qator = btn.filter(x => /nusxalash$/.test(x.getAttribute('aria-label') || ''));
    const tel = btn.filter(x => /raqamni nusxalash/.test(x.getAttribute('aria-label') || ''));
    if (!manzil) return { yoq: true };
    manzil.click();
    await new Promise(r => setTimeout(r, 250));
    let bufer = '';
    try { bufer = await navigator.clipboard.readText(); } catch (e) { bufer = 'XATO ' + e.message; }
    return { manzil: true, qator: qator.length, tel: tel.length, bufer: bufer.slice(0, 40) };
  });
  check('bojxona organlarida nusxalash ishlaydi',
    !nusxa.yoq && nusxa.qator >= 3 && nusxa.tel >= 1 && /Toshkent/.test(nusxa.bufer),
    `${nusxa.qator} ta qator, ${nusxa.tel} ta telefon · bufer "${nusxa.bufer}"`);

  check("bog'lanishda raqam bosiladi",
    aloqa.tel.length === 1 && aloqa.tel[0] === 'tel:+998555028630' && aloqa.ichki && aloqa.xarita >= 3,
    JSON.stringify(aloqa));

  /* Taqiqlangan tovarlar ro'yxatida har bir pozitsiyaning o'z belgisi
     bo'lsin — 23 qator, kamida 20 xil ikonka. */
  await page.locator('nav button', { hasText: 'Bojxona' }).first().click();
  await page.waitForTimeout(600);
  await page.getByText('Taqiqlangan tovarlar', { exact: false }).first().click();
  await page.waitForTimeout(800);
  const ban = await page.evaluate(async () => {
    const u = [...document.querySelectorAll('main div')]
      .map(d => (d.style.backgroundImage || '').match(/icons\/ban\/([a-z]+)\.webp/))
      .filter(Boolean).map(m => m[1]);
    const uniq = [...new Set(u)];
    const ok = await Promise.all(uniq.map(x => new Promise(r => {
      const im = new Image(); im.onload = () => r(true); im.onerror = () => r(false);
      im.src = 'icons/ban/' + x + '.webp';
    })));
    return { qator: u.length, xil: uniq.length, yuklandi: ok.filter(Boolean).length };
  });
  check('taqiq ro\'yxatida belgilar',
    ban.qator === 23 && ban.xil >= 20 && ban.yuklandi === ban.xil,
    `${ban.qator} qator, ${ban.xil} xil, ${ban.yuklandi} yuklandi`);

  /* Og'riq nuqtasi: kalkulyatorda me'yor oshganda mutaxassis tugmasi narx
     bilan, me'yor ichida bo'lsa yo'q; Telegram xabarida kalkulyator raqamlari. */
  await page.locator('button[aria-label="Orqaga qaytish"]').first().click();
  await page.waitForTimeout(500);
  await page.getByText('Bojxona kalkulyatori', { exact: false }).first().click();
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return {}; }; });
  /* Oldingi tekshiruvlar kalkulyatorda boshqa qiymat qoldirgan bo'lishi mumkin. */
  await page.locator('main input[aria-label*="summa"]').first().fill('320');
  await page.locator('main input[aria-label*="vazn"]').first().fill('2.5');
  await page.waitForTimeout(300);
  const ctaOver = page.locator('main button').filter({ hasText: /Hisobni tekshirtirish/ });
  const ctaOverN = await ctaOver.count();
  const ctaOverTxt = ctaOverN ? (await ctaOver.first().innerText()).replace(/\s+/g, ' ') : '';
  if (ctaOverN) { await ctaOver.first().click(); await page.waitForTimeout(200); }
  const ctaUrl = decodeURIComponent(await page.evaluate(() => (window.__opened || [])[0] || ''));
  await page.locator('main input[aria-label*="summa"]').first().fill('150');
  await page.waitForTimeout(300);
  const ctaWithin = await page.locator('main button').filter({ hasText: /Hisobni tekshirtirish/ }).count();
  check('kalkulyator: me\'yor oshganda mutaxassis tugmasi narx bilan',
    ctaOverN === 1 && /so'm/.test(ctaOverTxt) && /t\.me\/.*Boj hisobini tekshirish.*so'm.*Kalkulyator: oyda \$320/s.test(ctaUrl) && ctaWithin === 0,
    `${ctaOverTxt} · ichida: ${ctaWithin} · ${ctaUrl.slice(0, 90)}`);
  await page.locator('button[aria-label="Orqaga qaytish"]').first().click();
  await page.waitForTimeout(500);
  await page.getByText('Taqiqlangan tovarlar', { exact: false }).first().click();
  await page.waitForTimeout(700);

  /* Motion-tushuntirish: taqiq bo'limida yo'q, me'yor bo'limida bor;
     bosilganda o'ynaydi, qadam nuqtasi ishlaydi, orqaga chiqilganda yopiladi. */
  const moTaqiq = await page.locator('main button').filter({ hasText: /Qanday ishlaydi/ }).count();
  await page.locator('main button').filter({ hasText: /CHEKLANGAN/ }).first().click();
  await page.waitForTimeout(300);
  const banAmber = await page.locator('main button').filter({ hasText: /Qanday hujjat kerak\?/ }).count();
  await page.locator('main button').filter({ hasText: /TAQIQLANGAN/ }).first().click();
  await page.waitForTimeout(300);
  const banRed = await page.locator('main button').filter({ hasText: /Qanday hujjat kerak\?/ }).count();
  check('taqiqlar: cheklangan tovarda hujjat tugmasi, taqiqlanganda yo\'q', banAmber === 1 && banRed === 0, `${banAmber} / ${banRed}`);
  await page.locator('button[aria-label="Orqaga qaytish"]').first().click();
  await page.waitForTimeout(500);
  await page.getByText('Bojsiz olib kirish', { exact: false }).first().click();
  await page.waitForTimeout(700);
  const moKarta = page.locator('main button').filter({ hasText: /Qanday ishlaydi/ });
  const moBor = await moKarta.count();
  const moSub = moBor ? (await moKarta.first().innerText()).replace(/\s+/g, ' ') : '';
  if (moBor) { await moKarta.first().click(); await page.waitForTimeout(600); }
  const moBosh = await page.evaluate(() => ({
    qadam: (document.querySelector('main').innerText.match(/(\d+) \/ 11/) || [])[1],
    sahna: document.querySelectorAll('main svg .mo-pop, main svg .mo-in').length,
    sarlavha: /Oyiga \$200 bojsiz/.test(document.querySelector('main').innerText),
    izoh: /har bir qabul qiluvchi uchun alohida/.test(document.querySelector('main').innerText),
    /* Segmentli vaqt chizig'i tor ekranga sig'adi (11 nuqta sig'mas edi) */
    sigadi: (() => { const b = document.querySelector('main button[aria-label="1-qadam"]'); const r = b.parentElement.parentElement; return r.scrollWidth <= r.clientWidth; })()
  }));
  await page.locator('main button[aria-label="4-qadam"]').first().click().catch(() => {});
  await page.waitForTimeout(400);
  const moTort = await page.evaluate(() => (document.querySelector('main').innerText.match(/(\d+) \/ 11/) || [])[1]);
  /* Yagona to'lov bo'limida so'mdagi raqamlar kalkulyator formulasidan:
     BHM ning 25% yig'imi izohda ham, sahnada (HTML qatlam) ham bir xil. */
  await page.locator('button[aria-label="Orqaga qaytish"]').first().click();
  await page.waitForTimeout(500);
  await page.getByText('Yagona bojxona', { exact: false }).first().click();
  await page.waitForTimeout(600);
  await page.locator('main button').filter({ hasText: /Qanday ishlaydi/ }).first().click();
  await page.waitForTimeout(400);
  await page.locator('main button[aria-label="8-qadam"]').first().click().catch(() => {});
  await page.waitForTimeout(400);
  const moYigim = await page.evaluate(() => {
    const t = document.querySelector('main').innerText;
    const izoh = (t.match(/25% i = ([\d ]+) so'm/) || [])[1];
    const qatlam = [...document.querySelectorAll('main span')].map(x => x.textContent.trim()).filter(x => x === izoh).length;
    return { izoh, qatlam };
  });
  await page.locator('button[aria-label="Orqaga qaytish"]').first().click();
  await page.waitForTimeout(500);
  await page.getByText('Bojsiz olib kirish', { exact: false }).first().click();
  await page.waitForTimeout(600);
  const moYopiq = await page.locator('main button').filter({ hasText: /Qanday ishlaydi/ }).count();
  check('bojxona motion-tushuntirish: karta, o\'yin, qadam, yopilish',
    moTaqiq === 0 && moBor === 1 && /≈ 1,5 daqiqa · 11 qadam/.test(moSub) && moBosh.qadam === '1' && moBosh.sahna > 0 &&
    moBosh.sarlavha && moBosh.izoh && moBosh.sigadi && moTort === '4' && moYigim.izoh === '110 000' && moYigim.qatlam >= 1 && moYopiq === 1,
    JSON.stringify({ moTaqiq, moBor, moSub, moBosh, moTort, moYigim, moYopiq }));
  await page.locator('button[aria-label="Orqaga qaytish"]').first().click();
  await page.waitForTimeout(500);
  await page.getByText('Taqiqlangan tovarlar', { exact: false }).first().click();
  await page.waitForTimeout(700);

  /* Taqiq qidiruvi kirillcha so'rov va sinonimlarni tushunadi: "сигарет"
     ilgari hech narsa topmasdi. */
  const banQ = page.locator('main input[type=search]').first();
  const banTop = async (q) => { await banQ.fill(q); await banQ.dispatchEvent('change'); await page.waitForTimeout(350);
    return page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' ')); };
  const banCyr = await banTop('сигарет');
  const banSyn = await banTop('vape');
  check('taqiq qidiruvi: kirill va sinonim',
    /Elektron sigaretalar/.test(banCyr) && /Alkogol va tamaki/.test(banCyr) && /Elektron sigaretalar/.test(banSyn),
    banCyr.slice(0, 120));
  await banTop('');

  /* Til tugmalari ruscha rejimdan qaytganda ham o'z nomida qoladi: "Ўзбекча"
     ilgari bir marta lotinga o'girilib, qaytmay qolardi. */
  await page.locator('nav button', { hasText: 'Sozlamalar' }).first().click();
  await page.waitForTimeout(500);
  const tilTugma = async () => (await page.locator('main button[translate="no"]').allInnerTexts()).map(t => t.trim()).join(' | ');
  await page.locator('main button[translate="no"]').filter({ hasText: 'Русский' }).first().click();
  await page.waitForTimeout(500);
  const tilRu = await tilTugma();
  /* Sozlamalarda BHM bir marta (ilgari norms.json manbasi va shablon
     ikkalasi ham qo'shib, "BHM 440 000 so'm · BHM 440 000 so'm" chiqardi);
     bosh sahifada ruscha ko'plik: 43 магазина, 20 курьеров, 7 инструкций. */
  const ruSoz = await page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' '));
  check('ruscha sozlamalarda BRV bir marta', (ruSoz.match(/БРВ/g) || []).length === 1 && !/BHM/.test(ruSoz), (ruSoz.match(/Таможенные нормы:.{0,80}/) || [])[0]);
  await page.locator('nav button', { hasText: /Настройки|Sozlamalar/ }).first().click();
  await page.locator('nav button').first().click();
  await page.waitForTimeout(500);
  const ruBosh = await page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' '));
  check('ruscha ko\'plik: 43 магазина, 20 курьеров, 7 инструкций',
    /43 магазина/.test(ruBosh) && /20 курьеров/.test(ruBosh) && /7 инструкций/.test(ruBosh), ruBosh.slice(0, 200));
  await page.locator('nav button').last().click();
  await page.waitForTimeout(500);
  await page.locator('main button[translate="no"]').filter({ hasText: "O'zbekcha" }).first().click();
  await page.waitForTimeout(500);
  const tilUz = await tilTugma();
  check('til tugmalari ruschadan qaytganda buzilmaydi',
    tilRu === "O'zbekcha | Ўзбекча | Русский" && tilUz === "O'zbekcha | Ўзбекча | Русский", tilRu + ' / ' + tilUz);

  // Keyingi tekshiruvlar papkalar ekranidan davom etadi.
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(400);
  await page.getByText("Do'konlar", { exact: false }).first().click();
  await page.waitForTimeout(700);

  await page.getByText('Elektronika', { exact: false }).first().click();
  await page.waitForTimeout(600);
  /* Kartochkada toifa yorlig'i ilgari chiziladi va shu bilan tekshirilardi.
     Endi u yo'q (papka nomini takrorlardi), shuning uchun filtr papka
     sarlavhasidagi son bilan solishtiriladi. */
  const inFolder = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('button[style*="content-visibility"]')];
    const t = document.body.innerText;
    const bosh = (t.match(/Elektronika[\s\S]{0,80}?(\d+)\s*ta/) || [])[1];
    const topildi = (t.match(/(\d+)\s*ta do'kon topildi/) || [])[1];
    return { cards: cards.length, bosh: Number(bosh), topildi: Number(topildi),
      hint: /Shu bo'lim ichida qidirish/.test(document.body.innerHTML) };
  });
  check('papka ichida faqat o\'sha turdagi do\'konlar',
    inFolder.cards > 0 && inFolder.cards === inFolder.bosh &&
    inFolder.cards === inFolder.topildi && inFolder.hint,
    `${inFolder.cards} ta karta · sarlavhada ${inFolder.bosh} · natijada ${inFolder.topildi}`);

  /* Yorliqlar bitta qatorga sig'sin: ilgari to'rttasi uch qatorga yoyilib,
     kartochkani 135px ga cho'zardi. Kartochkada endi nomdan keyin do'konning
     o'z xususiyati bitta qator matn bo'lib turadi, shuning uchun balandlik
     100 emas, 112px gacha. */
  const yorliq = await page.evaluate(() => {
    const card = [...document.querySelectorAll('main button[style*="content-visibility"]')][0];
    /* Yorliqlar qatorini tuzilishga emas, mazmuniga qarab topamiz. */
    const row = [...card.querySelectorAll('div')]
      .find(d => d.children.length > 0 && [...d.children].every(c => c.tagName === 'SPAN'
        && /999px/.test(c.style.borderRadius || '')));
    const chips = row ? [...row.children] : [];
    const bir = new Set(chips.map(c => Math.round(c.getBoundingClientRect().top))).size === 1;
    const kesilgan = chips.some(c => c.scrollWidth > c.clientWidth + 1);
    return { soni: chips.length, bir, kesilgan,
      matn: chips.map(c => c.textContent.trim()).join(' '),
      qator: row ? Math.round(row.getBoundingClientRect().height) : -1,
      karta: Math.round(card.getBoundingClientRect().height) };
  });
  check("do'kon yorliqlari bitta qatorda",
    yorliq.bir && !yorliq.kesilgan && yorliq.soni >= 1 && yorliq.qator <= 30 && yorliq.karta <= 112,
    `${yorliq.matn} · qator ${yorliq.qator}px, karta ${yorliq.karta}px`);

  /* Har bir kartochkada do'konning o'z xususiyati yozilgan bo'lsin —
     birinchi marta o'qigan odam shu qatordan do'kon nima bilan farq
     qilishini bilib olsin. Yorliqlar qatorida narx darajasi doim,
     qolganidan esa ko'pi bilan bittasi (uchtadan ortiq yorliq qatorni
     ikkiga bo'lib yuboradi). */
  const faktlar = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('main button[style*="content-visibility"]')];
    const pill = d => d.children.length > 0 && [...d.children].every(c => c.tagName === 'SPAN'
      && /999px/.test(c.style.borderRadius || ''));
    const rows = cards.map(c => {
      const row = [...c.querySelectorAll('div')].find(pill);
      return row ? [...row.children].map(x => x.textContent.trim()) : [];
    });
    const xususiyat = cards.map(c => {
      const s = [...c.querySelectorAll('span')]
        .find(x => parseFloat(getComputedStyle(x).fontSize) === 13 && x.textContent.trim().length > 6);
      return s ? s.textContent.trim() : '';
    });
    return {
      narx: rows.every(r => /^\$+$/.test(r[0])),
      xususiyatBor: xususiyat.every(x => x.length > 6),
      xilma: new Set(xususiyat).size,
      jami: cards.length,
      eng: Math.max(...rows.map(r => r.length))
    };
  });
  check("har bir do'konda o'z xususiyati yozilgan",
    faktlar.narx && faktlar.xususiyatBor && faktlar.xilma === faktlar.jami && faktlar.eng <= 3,
    `${faktlar.xilma}/${faktlar.jami} xil xususiyat, eng ko'pi ${faktlar.eng} ta yorliq`);

  /* Papkadan chiqib, bo'lim tanlash ekraniga qaytiladi. */
  await page.goBack();
  await page.waitForTimeout(600);
  check('papkadan orqaga qaytiladi',
    await page.evaluate(() => /Bo'lim tanlang/.test(document.body.innerText)));

  // Qidiruv papkalarni chetlab o'tadi
  await page.locator('input[type=search]').first().fill('amazon');
  await page.waitForTimeout(500);
  const searched = await page.evaluate(() => ({
    chooser: /Bo'lim tanlang/.test(document.body.innerText),
    cards: document.querySelectorAll('button[style*="content-visibility"]').length
  }));
  check('qidiruv papkalarni chetlab natija beradi',
    !searched.chooser && searched.cards >= 1, `${searched.cards} ta`);
  await page.locator('input[type=search]').first().fill('');
  await page.waitForTimeout(400);

  // 10c. Kuryerlar bo'limi ham papka ko'rinishida
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(400);
  await page.getByText('Kuryerlar', { exact: false }).first().click();
  await page.waitForTimeout(600);
  const cFolders = await page.evaluate(() => ({
    chooser: /Yo'nalishni tanlang/.test(document.body.innerText),
    cards: [...document.querySelectorAll('button')].filter(b => /\d+ ta/.test(b.innerText)).length,
    list: document.querySelectorAll('div[style*="content-visibility"]').length
  }));
  check('Kuryerlar papka ko\'rinishida ochiladi',
    cFolders.chooser && cFolders.cards >= 8 && cFolders.list === 0,
    `papkalar ${cFolders.cards}, ro'yxat ${cFolders.list}`);

  /* Chetdagi davlat bayrog'i yirik ko'rinadi. Faqat shu ekranda u 3D rasm
     (flags/*.webp) — qolgan joylarda emoji bo'lib qoladi. Manzil doim
     O'zbekiston bo'lgani uchun ikkinchi bayroq va strelka olib tashlangan:
     ular har qatorda bir xil ma'lumotni takrorlardi. */
  const bayroq = await page.evaluate(() => {
    const kart = [...document.querySelectorAll('main button')]
      .filter(b => /\d+ ta|kuryer/.test(b.innerText));
    const en = [];
    let uzBor = false, strelka = false, emoji = 0, yuklanmagan = 0;
    for (const b of kart) {
      for (const d of b.querySelectorAll('div')) {
        const im = getComputedStyle(d).backgroundImage;
        if (!/flags\//.test(im)) continue;
        const r = d.getBoundingClientRect();
        en.push(Math.round(r.width));
        if (r.width < 1 || r.height < 1) yuklanmagan++;
      }
      for (const sp of b.querySelectorAll('span')) {
        if (sp.children.length) continue;
        const t = sp.textContent.trim();
        if (t === '\u{1F1FA}\u{1F1FF}') uzBor = true;
        if (/^\p{RI}\p{RI}$/u.test(t) || t === '\u{1F30D}') emoji++;
      }
      const box = b.querySelector('div');
      if (box && box.querySelector('svg') && box.querySelector('span')) strelka = true;
    }
    return { eng: en.length ? Math.min(...en) : 0, soni: en.length, uzBor, strelka, emoji, yuklanmagan };
  });
  /* Bayroq rasmi ekran o'quvchi uchun nomli (role=img + aria-label).
     sc-camel-aria-label chizilmasdi — nom yo'q edi. */
  const bayroqNom = await page.evaluate(() => {
    const els = [...document.querySelectorAll('main [role="img"]')];
    return { soni: els.length, nomli: els.filter(e => /bayrog/i.test(e.getAttribute('aria-label') || '')).length };
  });
  check('bayroq rasmlari nomli (aria-label)', bayroqNom.soni >= 9 && bayroqNom.nomli === bayroqNom.soni,
    `${bayroqNom.nomli}/${bayroqNom.soni}`);
  check('kuryer papkasida bayroq 3D rasm va yirik',
    bayroq && bayroq.soni === 9 && bayroq.eng >= 44 && !bayroq.yuklanmagan
      && bayroq.emoji === 0 && !bayroq.uzBor && !bayroq.strelka,
    JSON.stringify(bayroq));

  /* Bayroq rasmlari faqat shu ekranda. Papka ichida (kuryerlar ro'yxati)
     bayroq baribir emoji bo'lib qoladi — u yerda o'nlab marta
     takrorlanadi va har biri alohida rasm so'rovi bo'lib ketardi. */
  await page.getByText('Turkiya', { exact: false }).first().click();
  await page.waitForTimeout(500);
  const ichkari = await page.evaluate(() => ({
    rasm: [...document.querySelectorAll('div')]
      .filter(d => /flags\//.test(getComputedStyle(d).backgroundImage)).length,
    emoji: [...document.querySelectorAll('span')]
      .filter(sp => !sp.children.length && /^\p{RI}\p{RI}$/u.test(sp.textContent.trim())).length
  }));
  check('papka ichida bayroq emoji bo\'lib qoladi',
    ichkari.rasm === 0 && ichkari.emoji > 0,
    `rasm ${ichkari.rasm}, emoji ${ichkari.emoji}`);
  await page.goBack();
  await page.waitForTimeout(500);

  /* Yo'nalishlar bir xil oq plitka emas: ustida eng ko'p kuryerli yo'nalish
     katta kartochkada, qolganlarida mintaqa ohangi bayroq yonidagi
     hisob yorlig'ida turadi (kartaning o'zi oq). */
  const yoRitm = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('main button')];
    const hero = btns.find(x => /ENG KO'P KURYER/.test(x.innerText));
    const grid = [...document.querySelectorAll('main div')]
      .find(d => /repeat\(2/.test(d.style.gridTemplateColumns || '') &&
                 d.querySelectorAll(':scope > button').length >= 6);
    const plita = grid ? [...grid.querySelectorAll(':scope > button')] : [];
    const fon = new Set(plita.map(x => {
      const yorliq = [...x.querySelectorAll('span,div')]
        .find(d => /ta$/.test((d.textContent || '').trim()) &&
                   getComputedStyle(d).backgroundColor !== 'rgba(0, 0, 0, 0)');
      return yorliq ? getComputedStyle(yorliq).backgroundColor
        : getComputedStyle(x).backgroundImage;
    }));
    const katta = hero ? [...hero.querySelectorAll('span')]
      .some(x => parseFloat(getComputedStyle(x).fontSize) >= 26 && /^\d+$/.test(x.textContent.trim())) : false;
    return { hero: !!hero, katta, plita: plita.length, ohang: fon.size,
      keng: hero && grid ? Math.round(hero.getBoundingClientRect().width -
        plita[0].getBoundingClientRect().width) : 0 };
  });
  check("yo'nalishlar bir xil emas",
    yoRitm.hero && yoRitm.katta && yoRitm.plita >= 6 &&
    yoRitm.ohang === 4 && yoRitm.keng > 100,
    `katta kartochka +${yoRitm.keng}px, ${yoRitm.plita} plitka, ${yoRitm.ohang} ohang`);

  await page.getByText('Turkiya', { exact: false }).first().click();
  await page.waitForTimeout(600);
  const cInside = await page.evaluate(() => ({
    list: document.querySelectorAll('div[style*="content-visibility"]').length,
    all: document.querySelectorAll('div[style*="content-visibility"]').length,
    noCountryChips: !/🇨🇳 Xitoy/.test(document.body.innerText),
    title: /Turkiya yo'nalishi/.test(document.body.innerText)
  }));

  check('kuryer papkasi ichida faqat o\'sha yo\'nalish',
    cInside.list > 0 && cInside.list < 20 && cInside.noCountryChips && cInside.title,
    `${cInside.list} ta`);

  await page.goBack();
  await page.waitForTimeout(500);
  check('kuryer papkasidan orqaga qaytiladi',
    await page.evaluate(() => /Yo'nalishni tanlang/.test(document.body.innerText)));

  await page.getByText('Barcha kuryerlar', { exact: false }).first().click();
  await page.waitForTimeout(600);
  check('barcha kuryerlar papkasi to\'liq ro\'yxat beradi',
    await page.evaluate(() => document.querySelectorAll('div[style*="content-visibility"]').length) === 20);

  /* Kuryer logotiplari — do'konnikiga o'xshash 3D kvadrat ikonkalar:
     burchaklari shaffof va o'z soyasi bor. Shuning uchun uya kesilmasligi
     (overflow: visible) va ostida rangli plita qolmasligi kerak — aks holda
     ikonka burchaklari qirqiladi yoki atrofida rangli halqa ko'rinadi. */
  const kUya = await page.evaluate(() => {
    const rasm = [...document.querySelectorAll('div')]
      .filter(d => /logos\//.test(getComputedStyle(d).backgroundImage));
    const nat = { soni: rasm.length, kesilgan: 0, halqa: 0, cover: 0 };
    for (const d of rasm) {
      const u = d.parentElement;
      if (!u) continue;
      if (getComputedStyle(u).overflow !== 'visible') nat.kesilgan++;
      const fon = getComputedStyle(u).backgroundColor;
      if (fon !== 'rgba(0, 0, 0, 0)' && fon !== 'transparent') nat.halqa++;
      if (getComputedStyle(d).backgroundSize === 'cover') nat.cover++;
    }
    return nat;
  });
  check('kuryer logotipi uyasi kesmaydi va rangsiz',
    kUya.soni >= 20 && kUya.kesilgan === 0 && kUya.halqa === 0 && kUya.cover === 0,
    `${kUya.soni} ta logotip, kesilgan ${kUya.kesilgan}, rangli plita ${kUya.halqa}, cover ${kUya.cover}`);

  await page.goBack();
  await page.waitForTimeout(400);

  // 11. Do'kon logotiplari uchun bitta manba qoldi
  const logoHosts = ['unavatar.io', 'icons.duckduckgo.com'].filter(h => src.includes(h));
  check('ortiqcha logotip xizmatlari olib tashlandi', logoHosts.length === 0, logoHosts.join(', '));

  // 12. Kichik ekranda gorizontal siljish bo'lmasin (ilgari har bir ekranda
  //     ~14 px chiqib turardi: box-sizing yo'q edi)
  await page.setViewportSize({ width: 360, height: 780 });
  await page.waitForTimeout(400);
  for (const tab of ['Bosh sahifa', "Qo'llanmalar", 'Bojxona']) {
    await page.locator('nav button', { hasText: tab }).first().click().catch(() => {});
    await page.waitForTimeout(400);
    const over = await page.evaluate(() => {
      const m = document.querySelector('main');
      return m ? m.scrollWidth - m.clientWidth : 0;
    });
    check(`360 px da gorizontal siljish yo'q: ${tab}`, over <= 0, over > 0 ? `+${over}px` : '');
  }
  // Papkalar va papka ichi ham 360 px da siljimasin
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.getByText("Do'konlar", { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  for (const label of ['papkalar', 'papka ichi']) {
    if (label === 'papka ichi') {
      await page.getByText('Elektronika', { exact: false }).first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
    const over = await page.evaluate(() => {
      const m = document.querySelector('main');
      return m ? m.scrollWidth - m.clientWidth : 0;
    });
    check(`360 px da gorizontal siljish yo'q: ${label}`, over <= 0, over > 0 ? `+${over}px` : '');
  }
  await page.waitForTimeout(300);

  await page.setViewportSize({ width: 430, height: 880 });
  await page.waitForTimeout(300);

  // 13. Telegram ichida ochilganda kerakli chaqiruvlar bajariladi
  const tgPage = await context.newPage();
  await tgPage.addInitScript(() => {
    window.__tgCalls = [];
    const push = n => window.__tgCalls.push(n);
    window.Telegram = { WebApp: {
      version: '8.0', safeAreaInset: { top: 20, bottom: 12 }, contentSafeAreaInset: { top: 40, bottom: 0 },
      ready: () => push('ready'), expand: () => push('expand'),
      requestFullscreen: () => push('requestFullscreen'), disableVerticalSwipes: () => push('disableVerticalSwipes'),
      setHeaderColor: () => push('header'), setBackgroundColor: () => push('bg'), setBottomBarColor: () => push('bottom'),
      onEvent: () => {}, offEvent: () => {},
      HapticFeedback: { selectionChanged() {}, impactOccurred() {} },
      BackButton: { show() { window.__tgBack = true; }, hide() { window.__tgBack = false; }, onClick() {}, offClick() {} }
    } };
  });
  await tgPage.goto(base + '/', { waitUntil: 'load' });
  await tgPage.waitForTimeout(1500);
  const tgCalls = await tgPage.evaluate(() => window.__tgCalls || []);
  check('Telegram: to\'liq ekran va sozlamalar', ['ready', 'expand', 'requestFullscreen', 'disableVerticalSwipes'].every(c => tgCalls.includes(c)), tgCalls.join(','));
  const insets = await tgPage.evaluate(() => ({
    top: getComputedStyle(document.documentElement).getPropertyValue('--xy-safe-top').trim(),
    bottom: getComputedStyle(document.documentElement).getPropertyValue('--xy-safe-bottom').trim()
  }));
  check('Telegram: xavfsiz sohalar hisobga olinadi', insets.top === '60px' && insets.bottom === '12px', JSON.stringify(insets));
  await tgPage.close();

  /* Telegram SDK bloklovchi skript emas: oddiy brauzerda umuman so'ralmaydi,
     Telegram manzili bilan ochilganda esa yuklanadi. */
  check('oddiy brauzerda telegram.org ga so\'rov yo\'q',
    !tgRequests.length, tgRequests.join(', '));
  /* Do'kon logotiplari loyihaga saqlanmagan bo'lsa, ular favicon xizmatidan
     olinadi — bu yagona ruxsat etilgan istisno. `npm run store-logos` dan
     keyin u ham yo'qoladi va tekshiruv qat'iyroq bo'ladi. */
  const logosVendored = (() => {
    try { return JSON.parse(readFileSync(join(ROOT, 'stores', 'index.json'), 'utf8')).length > 0; }
    catch { return false; }
  })();
  const allowed = logosVendored ? [] : ['www.google.com'];
  const unexpected = [...new Set(thirdParty)].filter(h => !allowed.includes(h));
  check(logosVendored
      ? 'uchinchi tomon serveri yo\'q'
      : 'uchinchi tomon serveri yo\'q (do\'kon logotiplaridan tashqari)',
    unexpected.length === 0, unexpected.join(', ') || (logosVendored ? '' : 'logotiplar: npm run store-logos'));

  const tgUrlPage = await context.newPage();
  const tgUrlHits = [];
  tgUrlPage.on('request', r => { if (r.url().includes('telegram.org')) tgUrlHits.push(r.url()); });
  await tgUrlPage.route('**telegram.org/js/telegram-web-app.js', r => r.fulfill({
    status: 200, contentType: 'text/javascript',
    body: 'window.Telegram={WebApp:{version:"8.0",safeAreaInset:{top:0,bottom:0},contentSafeAreaInset:{top:0,bottom:0},ready(){window.__ready=1},expand(){},requestFullscreen(){},disableVerticalSwipes(){},setHeaderColor(){},setBackgroundColor(){},setBottomBarColor(){},onEvent(){},offEvent(){},HapticFeedback:{selectionChanged(){},impactOccurred(){}},BackButton:{show(){},hide(){},onClick(){},offClick(){}}}};'
  }));
  await tgUrlPage.goto(base + '/#tgWebAppPlatform=android&tgWebAppVersion=8.0', { waitUntil: 'load' });
  await tgUrlPage.waitForTimeout(1200);
  const tgUrlOk = await tgUrlPage.evaluate(() =>
    window.__ready === 1 && document.documentElement.classList.contains('in-telegram'));
  check('Telegram manzili bilan ochilganda SDK yuklanadi', tgUrlOk && tgUrlHits.length === 1,
    `so'rovlar: ${tgUrlHits.length}`);
  await tgUrlPage.close();

  // 14. Qo'llanma tez ochiladi va ichida siljish bo'lmaydi
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(400);
  await page.waitForTimeout(2500); // bo'sh vaqtdagi oldindan yuklash tugasin
  await page.locator('nav button', { hasText: "Qo'llanmalar" }).first().click();
  await page.waitForTimeout(500);
  const openedAt = Date.now();
  await page.getByText('Poizon', { exact: false }).first().click();
  await page.waitForFunction(() => {
    const f = document.querySelector('iframe');
    return f && f.contentDocument && f.contentDocument.querySelector('.tab');
  }, { timeout: 20000 }).catch(() => {});
  const openMs = Date.now() - openedAt;
  check('qo\'llanma tez ochiladi', openMs < 3000, openMs + ' ms');

  const guideFrame = page.frames().find(f => f.url().includes('guides/'));
  if (guideFrame) {
    await guideFrame.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(400);
    const cls = await guideFrame.evaluate(() => +(window.__cls || 0).toFixed(3));
    check('qo\'llanma ichida siljish yo\'q', cls < 0.05, 'CLS ' + cls);
    /* Qo'llanma ilovaning aynan o'sha shrift fayllarini ishlatishi kerak —
       aks holda ochilganda matn boshqa shriftda chizilib, keyin sakraydi. */
    const guideFont = await guideFrame.evaluate(() =>
      [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href)
        .find(h => h.includes('fonts/text.css')) || '');
    check('shrift ilova bilan bir xil faylardan',
      src.includes('fonts/text.css') && guideFont.endsWith('/fonts/text.css'),
      guideFont || 'topilmadi');
    const external = await guideFrame.evaluate(() =>
      [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href)
        .filter(h => !h.startsWith(location.origin)));
    check('qo\'llanmada tashqi shrift so\'rovi yo\'q', external.length === 0, external.join(', '));
  } else {
    check('qo\'llanma ochiladi (2)', false, 'iframe topilmadi');
  }

  // 15. Xato va yo'qolgan fayllar
  /* Toast — jonli hudud (role=status) doim DOM da: ekran o'quvchi faqat
     oldindan bor hududdagi o'zgarishni o'qiydi. */
  /* --- Service worker: kichik qobiq, keyin isitish, takrorda tarmoqsiz, oflayn ---
     Ilgari 161 fayl bir yo'la yuklanardi va foydalanuvchi ochgan ekranning
     ikonkalari bilan tarmoqni talashardi; takroriy ochilishda ham har
     chizilgan rasm orqa fonda qayta so'ralardi. */
  const swSrc = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const swLists = swSrc.match(/const PRECACHE = (\[[\s\S]*?\]);\nconst LATER = (\[[\s\S]*?\]);/);
  const qobiq = swLists ? JSON.parse(swLists[1]) : [], keyin = swLists ? JSON.parse(swLists[2]) : [];
  check('service worker qobig\'i kichik, qolgani keyin',
    qobiq.length > 0 && qobiq.length <= 25 && keyin.length >= 100
      && ['icons/stores-3d.webp', 'icons/courier-3d.webp', 'fonts/onest-latin.woff2'].every(f => qobiq.includes(f))
      && keyin.some(f => f.startsWith('stores/')) && keyin.some(f => f.startsWith('icons/ban/')),
    `qobiq ${qobiq.length}, keyin ${keyin.length}`);
  check('do\'kon logotiplari ro\'yxati index.html ichida',
    /const STORE_LOGO_IDS = \["/.test(readFileSync(join(ROOT, 'index.html'), 'utf8')) && src.includes('const STORE_LOGO_IDS = [];')
      && !hits.some(h => h.endsWith('stores/index.json')),
    hits.some(h => h.endsWith('stores/index.json')) ? 'index.json baribir so\'raldi' : '');
  /* Isitish: worker 'warm' ga javoban qolgan fayllarni keshlaydi va
     'warm-done' qaytaradi. Testda uni o'zimiz so'raymiz — sahifa buni
     tinchigach qiladi, lekin biz kutib o'tirmaymiz. */
  const isidi = await page.evaluate(() => new Promise(resolve => {
    if (!('serviceWorker' in navigator)) return resolve('sw yo\'q');
    const t = setTimeout(() => resolve('vaqt tugadi'), 90000);
    navigator.serviceWorker.ready.then(reg => {
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data && e.data.type === 'warm-done') { clearTimeout(t); resolve('tayyor'); }
      });
      const w = reg.active || navigator.serviceWorker.controller;
      if (!w) { clearTimeout(t); resolve('faol emas'); return; }
      w.postMessage({ type: 'warm' });
    }).catch(e => { clearTimeout(t); resolve('xato ' + e); });
  }));
  const keshda = await page.evaluate(async () => {
    const names = (await caches.keys()).filter(k => /^xarid-/.test(k) && !/logos/.test(k));
    let n = 0;
    for (const k of names) n += (await (await caches.open(k)).keys()).length;
    return n;
  });
  check('isitishdan keyin butun ro\'yxat keshda',
    isidi === 'tayyor' && keshda >= qobiq.length + keyin.length,
    `${isidi} · keshda ${keshda}, kutilgan ${qobiq.length + keyin.length}`);

  /* Takroriy ochilish: rasm va shriftlar faqat keshdan — serverga bironta
     ham so'rov bormaydi. */
  hits.length = 0;
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.locator('nav button').first().click();
  await page.waitForTimeout(400);
  await page.locator('main button').filter({ hasText: "Do'konlar" }).first().click();
  await page.waitForTimeout(400);
  await page.locator('main button').filter({ hasText: /Universal/ }).first().click();
  await page.waitForTimeout(700);
  await page.locator('nav button').first().click();
  await page.waitForTimeout(300);
  await page.locator('main button').filter({ hasText: 'Kuryerlar' }).first().click();
  await page.waitForTimeout(700);
  const tarmoqRasm = hits.filter(h => /\.(webp|png|woff2)$/.test(h));
  check('takroriy ochilishda rasm va shrift tarmoqdan so\'ralmaydi',
    tarmoqRasm.length === 0, tarmoqRasm.slice(0, 4).join(', '));

  /* Oflayn: ilova ochiladi, do'kon logotiplari va taqiq belgilari keshdan keladi. */
  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1500);
  const oflayn = await page.evaluate(async () => {
    const ok = async u => { try { const r = await fetch(u); return r.ok; } catch (e) { return false; } };
    return { nav: !!document.querySelector('nav'), taobao: await ok('stores/taobao.webp'),
      taqiq: await ok('icons/ban/giyohvand.webp'), bayroq: await ok('flags/xitoy.webp'), shrift: await ok('fonts/onest-latin.woff2') };
  });
  await context.setOffline(false);
  check('oflayn: ilova ochiladi va rasmlar keshdan keladi',
    oflayn.nav && oflayn.taobao && oflayn.taqiq && oflayn.bayroq && oflayn.shrift, JSON.stringify(oflayn));
  await page.locator('nav button').first().click().catch(() => {});
  await page.waitForTimeout(400);

  check('toast jonli hudud sifatida doim mavjud',
    await page.evaluate(() => { const t = document.querySelector('[role="status"][aria-live]'); return !!t && getComputedStyle(t).pointerEvents === 'none'; }));

  check('konsolda xato yo\'q', errors.length === 0, errors.slice(0, 2).join(' / '));
  check('404 yo\'q', missing.length === 0, missing.slice(0, 2).join(' / '));
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} ta tekshiruv o'tmadi: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nBarcha tekshiruvlar o\'tdi.');
