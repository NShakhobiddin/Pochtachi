#!/usr/bin/env node
// Namuna skrinshot: "qanday skrinshot kerak" degan savolga rasm bilan javob.
// Umumiy (hech qaysi do'kon brendi emas) xorijiy marketplace ilovasidagi
// tovar sahifasi chiziladi va media/shot-sample.webp ga yoziladi. Bosh
// sahifadagi namuna kartasi, birinchi kirishdagi hikoya va "Namunani
// ko'rish" natijasi shu rasmdan foydalanadi. Narx bloki koordinatalari
// (PRICE_BOX) ilovadagi halqa uchun konsolga chiqariladi.
//
// Ishlatish: node tools/sample-shot.mjs

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 390, H = 844, SCALE = 1.5, QUALITY = 0.82;
/* Shrift data: URL bilan — setContent sahifasi file:// dan o'qiy olmaydi. */
const font = f => 'data:font/woff2;base64,' + readFileSync(join(ROOT, 'fonts', f)).toString('base64');

const shoe = `
<svg viewBox="0 0 400 260" width="330" height="214" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="up" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E6E9F2"/></linearGradient>
    <linearGradient id="sole" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7F8FB"/><stop offset="1" stop-color="#C9CEDB"/></linearGradient>
    <linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2F5BFF"/><stop offset="1" stop-color="#1B2FA8"/></linearGradient>
    <radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="205" cy="232" rx="175" ry="16" fill="url(#sh)"/>
  <path d="M38 190c-6-30 8-58 40-66 28-7 52-24 70-52 8-12 24-16 36-8l34 24c16 11 36 14 54 10l40-8c26-5 52 12 58 38l6 30c3 14-7 27-21 28L70 214c-16 1-29-10-32-24z" fill="url(#up)" stroke="#C3C8D6" stroke-width="2"/>
  <path d="M36 196c2 14 14 24 28 23l300-19c16-1 27-13 26-28l-1-6-352 20z" fill="url(#sole)" stroke="#B9BFCF" stroke-width="2"/>
  <path d="M42 205l346-22" stroke="#9AA2B8" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  <path d="M120 150c40-6 92-30 130-62 14-12 34-10 44 4 10 14 6 32-8 40-46 28-106 38-158 34-12-1-20-14-8-16z" fill="url(#sw)"/>
  <path d="M170 86l26 18M184 76l26 18M198 66l24 17" stroke="#9AA2B8" stroke-width="5" stroke-linecap="round"/>
  <circle cx="330" cy="150" r="10" fill="#2F5BFF" opacity=".9"/>
  <path d="M60 178c40-4 90-10 130-14" stroke="#D5D9E4" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Onest;src:url(${font('onest-latin.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:Onest;src:url(${font('onest-latin-ext.woff2')}) format('woff2');font-weight:100 900;unicode-range:U+0100-024F}
*{box-sizing:border-box;margin:0;padding:0}
body{width:${W}px;height:${H}px;overflow:hidden;font-family:Onest,'DejaVu Sans',sans-serif;background:#F4F5F7;color:#1F2329}
.sb{height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;font-weight:700;font-size:15px;background:#fff}
.nav{height:48px;display:flex;align-items:center;gap:10px;padding:0 12px;background:#fff}
.srch{flex:1;height:34px;border-radius:17px;background:#F1F2F5;display:flex;align-items:center;gap:8px;padding:0 12px;font-size:14px;color:#6B7280}
.ic{width:24px;height:24px;flex:none}
.img{height:330px;background:linear-gradient(160deg,#F7F8FB,#E3E7F0);display:flex;align-items:center;justify-content:center;position:relative}
.cnt{position:absolute;right:12px;bottom:12px;background:rgba(0,0,0,.45);color:#fff;font-size:12px;font-weight:600;padding:3px 9px;border-radius:10px}
.thumbs{position:absolute;left:12px;bottom:12px;display:flex;gap:6px}
.thumbs i{width:30px;height:30px;border-radius:8px;background:#fff;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.thumbs i:first-child{border-color:#FF5A1F}
.card{background:#fff;margin:8px 8px 0;border-radius:14px;padding:12px 14px}
.price{display:flex;align-items:baseline;gap:6px;color:#FF4D1A;font-weight:800}
.price .y{font-size:18px}.price .n{font-size:34px;letter-spacing:-.02em;line-height:1}.price .d{font-size:18px}
.old{font-size:14px;color:#9CA3AF;text-decoration:line-through;font-weight:500;margin-left:4px}
.off{font-size:12px;font-weight:700;color:#fff;background:#FF4D1A;border-radius:6px;padding:2px 6px;margin-left:4px;align-self:center}
.sold{margin-left:auto;font-size:13px;color:#6B7280;font-weight:500;align-self:center}
.title{font-size:16px;font-weight:600;line-height:1.35;margin-top:8px}
.chips{display:flex;gap:6px;margin-top:10px}
.chips span{font-size:12px;font-weight:600;color:#0E9F6E;background:#E8F7F1;border-radius:6px;padding:3px 8px}
.rate{font-size:13px;color:#6B7280;margin-top:8px}.rate b{color:#F59E0B}
.row{display:flex;align-items:center;justify-content:space-between;font-size:14px}
.row .k{color:#6B7280}.sz{display:flex;gap:6px;margin-top:8px}
.sz span{min-width:38px;height:30px;border-radius:8px;border:1.5px solid #E5E7EB;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600}
.sz span.on{border-color:#FF4D1A;color:#FF4D1A;background:#FFF3EE}
.store{display:flex;align-items:center;gap:10px}
.av{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#2F5BFF,#1B2FA8);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px}
.bar{position:absolute;left:0;right:0;bottom:0;height:70px;background:#fff;display:flex;align-items:center;gap:10px;padding:0 12px 10px;box-shadow:0 -1px 0 #ECEDF0}
.bi{display:flex;flex-direction:column;align-items:center;font-size:10px;color:#6B7280;gap:2px;width:38px}
.btn{flex:1;height:42px;border-radius:21px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px}
</style></head><body>
<div class="sb"><span>9:41</span><span style="display:flex;gap:6px;align-items:center"><svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="#1F2329"/><rect x="5" y="5" width="3" height="7" rx="1" fill="#1F2329"/><rect x="10" y="2" width="3" height="10" rx="1" fill="#1F2329"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#1F2329"/></svg><svg width="26" height="12" viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="#1F2329"/><rect x="2" y="2" width="16" height="8" rx="2" fill="#1F2329"/><rect x="24" y="4" width="2" height="4" rx="1" fill="#1F2329"/></svg></span></div>
<div class="nav">
  <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#1F2329" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
  <div class="srch"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>running shoes men</div>
  <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#1F2329" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>
  <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#1F2329" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a2 2 0 002 1.6h8.8a2 2 0 002-1.6L22 7H6"/></svg>
</div>
<div class="img">${shoe}<div class="thumbs"><i></i><i></i><i></i><i></i></div><div class="cnt">1/6</div></div>
<div class="card" id="pc">
  <div class="price" id="price"><span class="y">¥</span><span class="n">699</span><span class="d">.00</span><span class="old">¥899</span><span class="off">-22%</span><span class="sold">2 000+ sold</span></div>
  <div class="title" id="title">Men's running shoes Air Run 90 — lightweight breathable mesh, cushioned sole</div>
  <div class="chips"><span>Free shipping</span><span>7-day returns</span></div>
  <div class="rate"><b>★ 4.8</b> · 3 512 reviews</div>
</div>
<div class="card">
  <div class="row"><span class="k">Color</span><span>White / Blue</span></div>
  <div class="sz"><span>39</span><span>40</span><span class="on">41</span><span>42</span><span>43</span><span>44</span></div>
</div>
<div class="card"><div class="store"><div class="av">S</div><div style="flex:1"><div style="font-weight:700;font-size:14px">Sport Official Store</div><div style="font-size:12px;color:#6B7280">98% positive · 1.2M followers</div></div><div style="font-size:13px;font-weight:700;color:#FF4D1A;border:1.5px solid #FF4D1A;border-radius:14px;padding:4px 12px">Follow</div></div></div>
<div class="bar">
  <div class="bi"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></svg>Store</div>
  <div class="bi"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/></svg>Chat</div>
  <div class="btn" style="background:#FFE9DF;color:#FF4D1A">Add to cart</div>
  <div class="btn" style="background:linear-gradient(90deg,#FF7A1A,#FF4D1A);color:#fff">Buy now</div>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const box = await page.evaluate(() => {
  const r = el => { const b = document.getElementById(el).getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; };
  return { price: r('price'), title: r('title'), card: r('pc') };
});
const png = await page.screenshot({ type: 'png' });
const webp = await page.evaluate(async ({ b64, q }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/webp', q).split(',')[1];
}, { b64: png.toString('base64'), q: QUALITY });
await browser.close();
mkdirSync(join(ROOT, 'media'), { recursive: true });
const out = join(ROOT, 'media', 'shot-sample.webp');
writeFileSync(out, Buffer.from(webp, 'base64'));
const pct = ([x, y, w, h]) => [x / W, y / H, w / W, h / H].map(v => +(v * 100).toFixed(2));
console.log('media/shot-sample.webp', Math.round(Buffer.from(webp, 'base64').length / 1024) + ' KB', W * SCALE + 'x' + H * SCALE);
console.log('PRICE_BOX % (x, y, w, h):', JSON.stringify(pct(box.card)), 'narx:', JSON.stringify(pct(box.price)));
