#!/usr/bin/env node
// Qidiruv tizimlari va ijtimoiy tarmoqlar uchun meta ma'lumotlarni yozadi.
//
// Nima qiladi:
//   1. Har bir qo'llanmaga description, canonical, OG/Twitter teglari va
//      mustaqil ochilganda ko'rinadigan sayt paneli qo'shadi (idempotent).
//   2. guides/index.html — qo'llanmalarning indekslanadigan ro'yxatini yasaydi.
//   3. sitemap.xml va robots.txt ni yangilaydi.
//
// Ishlatish: node tools/seo.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://nshakhobiddin.github.io/Pochtachi/';
const OG_IMAGE = SITE + 'icons/og-cover.png';

const GUIDES = [
  { id: 'taobao', title: 'Taobao', flag: '🇨🇳', sections: 10, desc: "Rasm orqali qidiruv, Alipay to'lovi, kargo ombori va bojxona" },
  { id: 'pinduoduo', title: 'Pinduoduo', flag: '🇨🇳', sections: 9, desc: "Guruh xaridi mexanikasi, xitoycha lug'at, eng arzon yo'nalish" },
  { id: 'poizon', title: 'Poizon (Dewu)', flag: '🇨🇳', sections: 10, desc: "Autentifikatsiya yorlig'i, krossovka o'lchami, vositachi tanlash" },
  { id: 'shein', title: 'SHEIN', flag: '🇨🇳', sections: 9, desc: "To'g'ridan-to'g'ri pochta orqali yoki oraliq manzil bilan, o'lcham xatolari va qaytarish" },
  { id: 'trendyol', title: 'Trendyol', flag: '🇹🇷', sections: 9, desc: "Turk manzili, KDV qaytarilishi, beden tablosu va lug'at" },
  { id: 'amazon', title: 'Amazon', flag: '🇺🇸', sections: 10, desc: "AQSh manzili, sales tax 0% shtatlari, US o'lchamlari" },
  { id: 'ebay', title: 'eBay', flag: '🇺🇸', sections: 9, desc: "Auksion strategiyasi, eIS orqali to'g'ridan yetkazish" }
];

/* Ilova bilan AYNAN bir xil shrift fayllari: qo'llanma ochilganda ular
   allaqachon keshda bo'ladi va matn "sakramaydi". Manzil o'z domenimizda
   bo'lgani uchun tashqi hostga ulanish, DNS va TLS kutish yo'q — ilgari
   shrift Google'dan kelmaguncha qo'llanma ochilmay turardi. */
const fontLinks = prefix => [
  `<link rel="preload" href="${prefix}fonts/onest-latin.woff2" as="font" type="font/woff2" crossorigin>`,
  `<link rel="stylesheet" href="${prefix}fonts/text.css">`
];

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MARK_START = '<!-- seo:start -->';
const MARK_END = '<!-- seo:end -->';

function guideMeta(g) {
  const url = `${SITE}guides/inline/${g.id}.html`;
  const title = `${g.title} → O'zbekiston: bosqichma-bosqich qo'llanma`;
  const desc = `${g.title} dan O'zbekistonga buyurtma berish: ${g.desc}. ${g.sections} bo'lim, ekran maketlari, bojxona kalkulyatori va lug'at bilan.`;
  return [
    MARK_START,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Xarid Yordamchisi">`,
    `<meta property="og:locale" content="uz_UZ">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${OG_IMAGE}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="theme-color" content="#3B2CC9">`,
    ...fontLinks('../../'),
    /* Ilova ichida ochilganini birinchi chizishdan OLDIN belgilaymiz: aks holda
       avval to'liq sarlavha chizilib, keyin ixchamlashadi va butun matn
       sakrab tushadi (o'lchangan siljish 0,24 edi). */
    `<script>try{if(window.top!==window.self)document.documentElement.className+=' in-app';}catch(e){document.documentElement.className+=' in-app';}</script>`,
    MARK_END
  ].join('\n');
}

// Mustaqil ochilganda ko'rinadigan panel. Ilova ichida (iframe) guide.js uni yashirin qoldiradi.
function siteBar(g) {
  return `${MARK_START}
<nav id="site-bar" hidden aria-label="Sayt">
  <a href="../../">Xarid Yordamchisi</a>
  <span aria-hidden="true">·</span>
  <a href="../">Barcha qo'llanmalar</a>
  <span aria-hidden="true">·</span>
  <span>${esc(g.title)}</span>
</nav>
${MARK_END}`;
}

function stripMarked(html) {
  return html.replace(new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}\\n?`, 'g'), '');
}

let touched = 0;
for (const g of GUIDES) {
  const path = join(ROOT, 'guides', 'inline', `${g.id}.html`);
  let html = stripMarked(readFileSync(path, 'utf8'));
  html = html.replace('</head>', `${guideMeta(g)}\n</head>`);
  html = html.replace(/<body([^>]*)>/, (m, attrs) => `<body${attrs}>\n${siteBar(g)}`);
  writeFileSync(path, html);
  touched++;
}

// ---- Qo'llanmalar ro'yxati -------------------------------------------------
const cards = GUIDES.map(g => `      <li>
        <a class="guide-card" href="inline/${g.id}.html">
          <span class="guide-flag" aria-hidden="true">${g.flag}</span>
          <span class="guide-body">
            <span class="guide-title">${esc(g.title)} → O'zbekiston</span>
            <span class="guide-desc">${esc(g.desc)}</span>
            <span class="guide-meta">${g.sections} ta bo'lim</span>
          </span>
        </a>
      </li>`).join('\n');

const hubDesc = "Taobao, Pinduoduo, Poizon, SHEIN, Trendyol, Amazon va eBay'dan O'zbekistonga buyurtma berish bo'yicha bosqichma-bosqich qo'llanmalar.";
const hub = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Chetdan buyurtma berish qo'llanmalari · Xarid Yordamchisi</title>
<meta name="description" content="${esc(hubDesc)}">
<link rel="canonical" href="${SITE}guides/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Xarid Yordamchisi">
<meta property="og:locale" content="uz_UZ">
<meta property="og:url" content="${SITE}guides/">
<meta property="og:title" content="Chetdan buyurtma berish qo'llanmalari">
<meta property="og:description" content="${esc(hubDesc)}">
<meta property="og:image" content="${OG_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#3B2CC9">
<link rel="icon" href="../icons/icon-192.png" sizes="192x192">
${fontLinks('../').join('\n')}
<link rel="stylesheet" href="guide-base.css">
<link rel="stylesheet" href="guide-common.css">
<style>
  .hub { max-width: 720px; margin: 0 auto; padding: 32px 18px 64px; }
  .hub h1 { font-size: 28px; line-height: 1.2; margin: 0 0 10px; color: var(--slate-900); }
  .hub .lede { color: var(--slate-600); margin: 0 0 28px; }
  .hub ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
  .guide-card { display: flex; gap: 14px; align-items: flex-start; text-decoration: none;
                background: #fff; border: 1px solid var(--slate-200); border-radius: var(--radius);
                padding: 16px 18px; box-shadow: var(--shadow-sm); color: inherit; }
  .guide-card:hover { border-color: var(--indigo-300); box-shadow: var(--shadow); }
  .guide-card:focus-visible { outline: 3px solid var(--indigo-500); outline-offset: 2px; }
  .guide-flag { font-size: 26px; line-height: 1.2; }
  .guide-body { display: flex; flex-direction: column; gap: 3px; }
  .guide-title { font-weight: 700; color: var(--indigo-700); }
  .guide-desc { color: var(--slate-600); font-size: 14px; }
  .guide-meta { color: var(--slate-400); font-size: 13px; font-variant-numeric: tabular-nums; }
  .hub .back { display: inline-block; margin-top: 28px; color: var(--indigo-600); font-weight: 600; text-decoration: none; }
  .hub .back:hover { text-decoration: underline; }
</style>
</head>
<body>
  <main class="hub">
    <h1>Chetdan buyurtma berish qo'llanmalari</h1>
    <p class="lede">${esc(hubDesc)} Har bir qo'llanmada bojxona kalkulyatori, atamalar lug'ati va tez-tez so'raladigan savollar bor.</p>
    <ul>
${cards}
    </ul>
    <a class="back" href="../">← Xarid Yordamchisi ilovasiga qaytish</a>
  </main>
</body>
</html>
`;
writeFileSync(join(ROOT, 'guides', 'index.html'), hub);

// ---- sitemap.xml / robots.txt ---------------------------------------------
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: SITE, priority: '1.0' },
  { loc: SITE + 'guides/', priority: '0.9' },
  ...GUIDES.map(g => ({ loc: `${SITE}guides/inline/${g.id}.html`, priority: '0.8' }))
];
writeFileSync(join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n') +
  `\n</urlset>\n`);

writeFileSync(join(ROOT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\n# Dizayn manbasi va logotiplarning asl nusxalari indekslanmasin\n` +
  `Disallow: /Pochtachi/Xarid%20Yordamchisi%20v2.dc.html\nDisallow: /Pochtachi/logos/src/\n\n` +
  `Sitemap: ${SITE}sitemap.xml\n`);

console.log(`${touched} ta qo'llanmaga meta qo'shildi; guides/index.html, sitemap.xml, robots.txt yangilandi.`);
