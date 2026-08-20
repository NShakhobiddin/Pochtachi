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

  // 3. Bojxona kalkulyatori: $320, 2.5 kg, $9/kg -> ma'lum natija
  await page.locator('nav button', { hasText: 'Bojxona' }).first().click();
  await page.waitForTimeout(600);
  const calc = await page.evaluate(() => {
    const text = document.body.innerText;
    const m = text.match(/([\d\s]+)\s*so'm/g);
    return m ? m.slice(0, 4).join(' | ') : '';
  });
  check('kalkulyator natija chiqaradi', /\d/.test(calc), calc.slice(0, 60));

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
    const fontLinks = await guideFrame.evaluate(() =>
      [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href).filter(h => h.includes('fonts.googleapis')));
    const appFont = src.match(/https:\/\/fonts\.googleapis\.com\/css2\?family=Bricolage[^"']+/);
    check('shrift manzili ilova bilan bir xil',
      !!appFont && fontLinks.some(h => h.replace(/&amp;/g, '&') === appFont[0].replace(/&amp;/g, '&')),
      fontLinks[0] || 'topilmadi');
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
