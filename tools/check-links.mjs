#!/usr/bin/env node
// Ilovadagi tashqi havolalarni tekshiradi (do'kon saytlari, kuryerlar,
// ilova do'konlari, davlat xizmatlari — jami 200 dan ortiq manzil).
//
// Direktoriya turidagi sayt uchun havolalarning eskirishi asosiy sifat xavfi,
// shuning uchun bu tekshiruv haftalik ishga tushadi.
//
// Ishlatish: node tools/check-links.mjs [--limit N] [--timeout MS]

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : def;
};
const LIMIT = arg('--limit', 0);
const TIMEOUT = arg('--timeout', 15000);
const CONCURRENCY = 6;

// Tekshirilmaydiganlar: bot so'rovini bloklaydigan yoki mintaqaga bog'liq xizmatlar.
const SKIP = [/^https?:\/\/(www\.)?instagram\.com/, /^https?:\/\/t\.me/, /^https?:\/\/fonts\.(googleapis|gstatic)\.com/,
  /* O'z Worker'imiz — uni "O'lchovni yoqish" workflow'i yo'llari bilan tekshiradi. */
  /\.workers\.dev\//,
  /* Koddagi shablonlar, haqiqiy manzil emas: "…domain=" + domen, "…?campid=…". */
  /[…{]|=$/,
  /* Izohdagi misollar (ulashish matni namunasi). */
  /^https:\/\/a\.co\/d\/x$/, /^https:\/\/m\.tb\.cn\/h\.X$/];

/* Qo'lda tasdiqlangan saytlar: brauzerda ochiladi, lekin GitHub serverlaridan
   ulanib bo'lmaydi (.uz saytlar chet el IP manzilini yoki to'liq bo'lmagan
   SSL zanjirini rad etadi). Ulanish xatosi bo'lsa — ogohlantirish; domen
   umuman topilmasa (ENOTFOUND) — baribir xato. Sana — oxirgi qo'lda tekshiruv. */
const VERIFIED = {
  'https://yumecs.uz/': '02.10.2026',
  'https://www.spaceexpress.uz': '02.10.2026'
};

function collectUrls() {
  const files = ['Xarid Yordamchisi v2.dc.html',
    ...readdirSync(join(ROOT, 'guides', 'inline')).map(f => join('guides', 'inline', f))];
  const urls = new Set();
  for (const f of files) {
    const text = readFileSync(join(ROOT, f), 'utf8');
    for (const m of text.matchAll(/https?:\/\/[^\s"'<>)\\]+/g)) {
      const url = m[0].replace(/[.,;]+$/, '');
      if (!SKIP.some(re => re.test(url))) urls.add(url);
    }
  }
  return [...urls].sort();
}

async function head(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  const opts = {
    redirect: 'follow',
    signal: ctrl.signal,
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; PochtamLinkCheck/1.0)' }
  };
  try {
    let res = await fetch(url, { ...opts, method: 'HEAD' });
    // Ba'zi saytlar HEAD ni qo'llab-quvvatlamaydi — GET bilan qayta urinamiz.
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, { ...opts, method: 'GET' });
    }
    return { url, status: res.status };
  } catch (e) {
    /* "fetch failed" o'zi sababni aytmaydi — ichidagi kod (ENOTFOUND, TLS,
       ulanish vaqti) logda ko'rinsin. */
    const code = e && e.cause && (e.cause.code || e.cause.message);
    return { url, status: 0, error: String(e.message || e).slice(0, 60) + (code ? ' (' + String(code).slice(0, 60) + ')' : ''), code: code ? String(code) : '' };
  } finally {
    clearTimeout(timer);
  }
}

const urls = collectUrls();
const targets = LIMIT ? urls.slice(0, LIMIT) : urls;
console.log(`${targets.length} ta havola tekshirilmoqda (jami topilgan: ${urls.length})...\n`);

/* 403/429 — ko'pincha bot himoyasi (App Store, ba'zi do'konlar), 401 esa
   avtorizatsiya talabi. Bular "o'lgan havola" emas, shuning uchun ular
   ogohlantirish sifatida chiqadi va ishni yiqitmaydi. Faqat 404/410 va
   ulanmaydigan manzillar xato hisoblanadi. */
const SOFT = new Set([401, 403, 429]);
/* Katta do'konlar (Best Buy, noon) bot so'roviga javob bermay turib qoladi —
   bu ham "o'lik havola" emas. DNS yoki ulanish xatosi esa haqiqiy xato. */
const softErr = r => !r.status && /abort/i.test(r.error || '');
const dead = [];
const warn = [];
let done = 0;
const queue = [...targets];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const url = queue.shift();
    const r = await head(url);
    done++;
    if (r.status && r.status < 400) continue;
    if (SOFT.has(r.status) || softErr(r)) { warn.push(r); continue; }
    if (VERIFIED[url] && !r.status && !/ENOTFOUND/.test(r.code || '')) { warn.push({ ...r, error: r.error + ' — qo\'lda tasdiqlangan ' + VERIFIED[url] }); continue; }
    dead.push(r);
    console.log(` XATO  ${r.status || r.error}  ${r.url}`);
  }
}));

console.log(`\nTekshirildi: ${done} · ishlamaydigan: ${dead.length} · tekshirib bo'lmadi: ${warn.length}`);
if (warn.length) {
  console.log('\nTekshirib bo\'lmadi (bot himoyasi, avtorizatsiya yoki robotga yopiq sayt):');
  for (const w of warn) console.log(`  ${w.status || w.error}  ${w.url}`);
}
if (dead.length) {
  console.log('\nIshlamaydigan havolalar:');
  for (const d of dead) console.log(`  ${d.status || d.error}  ${d.url}`);
  process.exit(1);
}
