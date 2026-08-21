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
const context = await browser.newContext({ viewport: { width: 430, height: 880 } });
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
// Ma'lum va zararsiz xabarlar: brauzer <x-dc> shablonini render'dan oldin
// parse qilganda SVG `d="{{ ... }}"` qiymatlaridan shikoyat qiladi; shriftlar
// esa test muhitida tashqi domendan yuklanmaydi.
const BENIGN = /Expected moveto path command|font|CORS|net::ERR/i;
page.on('console', m => { if (m.type() === 'error' && !BENIGN.test(m.text())) errors.push(m.text()); });
page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) missing.push(r.status() + ' ' + r.url()); });
/* Oddiy brauzerda ilova tashqariga faqat valyuta kursi uchun chiqadi.
   Shrift, SDK va boshqa hamma narsa o'z domenimizda — birinchi bo'yoq
   uchinchi tomon serveriga bog'liq bo'lmasligi kerak. */
const tgRequests = [];
const thirdParty = [];
page.on('request', r => {
  const u = r.url();
  if (u.includes('telegram.org')) tgRequests.push(u);
  if (!u.startsWith(base) && !u.startsWith('data:') && !u.includes('cbu.uz')) thirdParty.push(new URL(u).host);
});

try {
  // 1. Ilova ko'tariladi
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  check('ilova ko\'tariladi', await page.evaluate(() => !!document.querySelector('#dc-root')?.firstChild));
  check('onboarding o\'tadi', await passOnboarding(page));

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
  await page.goBack();
  await page.waitForTimeout(400);

  // 4. Qidiruv kirillcha so'rovni tushunadi
  await page.locator('nav button', { hasText: 'Bosh sahifa' }).first().click();
  await page.waitForTimeout(500);
  const input = page.locator('input').first();
  await input.fill('Али');
  await page.waitForTimeout(400);
  check('kirillcha qidiruv ishlaydi', /AliExpress/i.test(await page.evaluate(() => document.body.innerText)));
  await input.fill('');

  // 5. Qo'llanma iframe'da ochiladi
  await page.locator('nav button', { hasText: "Qo'llanmalar" }).first().click();
  await page.waitForTimeout(600);
  await page.getByText('Taobao', { exact: true }).first().click();
  await page.waitForTimeout(1800);
  const frame = page.frames().find(f => f.url().includes('guides/'));
  check('qo\'llanma ochiladi', !!frame, frame ? frame.url().split('/').pop() : '');

  // 6. Qo'llanmalar ro'yxati mustaqil sahifa sifatida ishlaydi
  const hub = await context.newPage();
  await hub.goto(base + '/guides/', { waitUntil: 'load' });
  check('qo\'llanmalar ro\'yxati', (await hub.locator('.guide-card').count()) === 7);
  await hub.close();

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

  await page.getByText('Elektronika', { exact: false }).first().click();
  await page.waitForTimeout(600);
  const inFolder = await page.evaluate(() => ({
    cards: document.querySelectorAll('button[style*="content-visibility"]').length,
    onlyCat: [...document.querySelectorAll('button[style*="content-visibility"]')]
      .every(b => /elektronika/i.test(b.innerText)),
    hint: /Shu bo'lim ichida qidirish/.test(document.body.innerHTML)
  }));
  check('papka ichida faqat o\'sha turdagi do\'konlar',
    inFolder.cards > 0 && inFolder.onlyCat && inFolder.hint,
    `${inFolder.cards} ta`);

  await page.goBack();
  await page.waitForTimeout(500);
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
  await page.goBack().catch(() => {});
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
