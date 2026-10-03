import '../../core/share.js';
/* Mahsulot havolasini o'qish (2026-09-27).
 *
 * Havola tashlansa ilova skrinshotdagi kabi "Jami narx" ekranini ochadi.
 * Birinchi yo'l AI'siz: sahifa HTML'idagi tuzilgan ma'lumot — JSON-LD
 * Product, OpenGraph / product:price meta, itemprop. Ko'p do'kon (Shopify,
 * brend saytlari, Trendyol, eBay…) buni qidiruv tizimlari uchun beradi,
 * shuning uchun tez (1–2 s) va bepul. Topilmasa ai.js dagi readLink sahifa
 * matnini arzon modelga beradi, sahifa umuman ochilmasa Claude web_fetch
 * bilan o'qiydi.
 *
 * Bu faylda faqat sof funksiyalar (tarmoqsiz) va sahifani yuklash — test
 * qilish oson.
 */

/* Amazon kabi sahifalar 2–3 MB: narx bloki 1,5 MB dan keyin ham kelishi
   mumkin (jonli sinovda sahifa aynan 1,5 MB da kesilgan edi). */
export const LINK_MAX_BYTES = 3500000;
export const LINK_TIMEOUT_MS = 8000;
const TEXT_MAX = 12000;

/* Ochiq internetdagi manzilmi: http(s), standart port, login/parolsiz,
   IP-manzil va ichki nomlar emas. Worker ochiq proksiga aylanmasin. */
export function safeLink(u) {
  let x;
  try { x = new URL(String(u || '')); } catch (e) { return null; }
  if (!/^https?:$/.test(x.protocol) || x.username || x.password) return null;
  if (x.port && x.port !== '80' && x.port !== '443') return null;
  const h = x.hostname.toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(h) || /^\d+(\.\d+){3}$/.test(h)) return null;
  if (/(^|\.)(localhost|local|internal|lan|home|corp)$/.test(h)) return null;
  return x;
}

/* Sahifani yuklaydi: vaqt (hammasi uchun bitta) va hajm chegarasi bilan.
   Yo'naltirishlar qo'lda, 8 tagacha: har keyingi manzil ham safeLink dan
   o'tadi — ochiq manzil ichki yoki IP manzilga yo'naltira olmaydi.
   Kodlash: sarlavhadagi yoki <meta charset> dagi (GBK, Shift_JIS…), bilmasa
   UTF-8. Javob: { ok, status, html, url } — ok faqat 2xx va HTML bo'lsa. */
const HEADERS = {
  /* Desktop sahifa: mobil versiyada narx bloklari boshqa nomda va
     kamroq tuzilgan ma'lumot bo'ladi. */
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 PochtamLinkReader/1.0',
  accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
  'accept-language': 'en-US,en;q=0.8,ru;q=0.6'
};
const cancel = async res => { try { if (res.body && res.body.cancel) await res.body.cancel(); } catch (e) {} };
export function charsetOf(ct, head) {
  const m = /charset\s*=\s*["']?([\w-]+)/i.exec(String(ct || '')) || /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(String(head || ''));
  return m ? m[1].toLowerCase() : 'utf-8';
}
/* Cookie: ba'zi do'konlar (AliExpress) avval cookie o'rnatish sahifasiga
   yo'naltirib, keyin qaytaradi — cookie'siz yo'naltirish aylanib qoladi.
   Cookie faqat shu so'rov davomida va faqat o'zi kelgan domen (oxirgi ikki
   bo'lagi: aliexpress.com, aliexpress.us) manzillariga yuboriladi — bir
   saytning cookie'si boshqasiga o'tmaydi. */
const siteOf = h => String(h || '').toLowerCase().split('.').slice(-2).join('.');
const setCookies = res => {
  const hd = res.headers;
  if (!hd) return [];
  if (typeof hd.getSetCookie === 'function') return hd.getSetCookie();
  const v = hd.get && hd.get('set-cookie');
  return v ? [v] : [];
};
export async function fetchPage(url, fetchFn, ms = LINK_TIMEOUT_MS) {
  const deadline = Date.now() + ms;
  let cur = url;
  const jar = new Map();
  for (let hop = 0; hop <= 8; hop++) {
    const site = siteOf(new URL(cur).hostname), ck = jar.get(site);
    const init = { method: 'GET', redirect: 'manual', headers: ck && ck.size ? { ...HEADERS, cookie: [...ck].map(([k, v]) => k + '=' + v).join('; ') } : HEADERS };
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(Math.max(500, deadline - Date.now()));
    let res;
    try { res = await fetchFn(cur, init); } catch (e) { return { ok: false, status: 0, html: '', url: cur }; }
    for (const c of setCookies(res)) {
      const m = /^\s*([^=;\s]+)=([^;]*)/.exec(c);
      if (m) { if (!jar.has(site)) jar.set(site, new Map()); jar.get(site).set(m[1], m[2]); }
    }
    const loc = res.headers && res.headers.get && res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) {
      await cancel(res);
      let next = null;
      try { next = safeLink(new URL(loc, cur).href); } catch (e) { next = null; }
      if (!next) return { ok: false, status: res.status, html: '', url: cur };
      cur = next.href;
      continue;
    }
    const ct = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
    if (!res.ok || (ct && !/html|xml/i.test(ct))) { await cancel(res); return { ok: false, status: res.status || 0, html: '', url: cur }; }
    const parts = []; let n = 0;
    if (res.body && typeof res.body.getReader === 'function') {
      const rd = res.body.getReader();
      for (;;) {
        let chunk;
        try { chunk = await rd.read(); } catch (e) { break; }
        if (chunk.done) break;
        parts.push(chunk.value); n += chunk.value.byteLength;
        if (n >= LINK_MAX_BYTES) { try { await rd.cancel(); } catch (e) {} break; }
      }
    } else {
      try { const b = new Uint8Array(await res.arrayBuffer()); parts.push(b.subarray(0, LINK_MAX_BYTES)); n = parts[0].byteLength; } catch (e) {}
    }
    const buf = new Uint8Array(n); let o = 0;
    for (const p of parts) { const take = Math.min(p.byteLength, n - o); buf.set(p.subarray(0, take), o); o += take; }
    let head = ''; for (let k = 0; k < Math.min(4096, n); k++) head += String.fromCharCode(buf[k]);
    let dec;
    try { dec = new TextDecoder(charsetOf(ct, head)); } catch (e) { dec = new TextDecoder('utf-8'); }
    const html = dec.decode(buf);
    return { ok: html.length > 0, status: res.status || 200, html, url: cur };
  }
  return { ok: false, status: 310, html: '', url: cur };
}

/* "1,299.00" · "1.299,00" · "129.99" · "1 299" · "12900" → son. */
export function parsePrice(v) {
  if (typeof v === 'number') return isFinite(v) && v > 0 ? v : 0;
  let s = String(v == null ? '' : v).replace(/[\s  ']/g, '').replace(/[^\d.,]/g, '');
  if (!s) return 0;
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc >= 0 && ld >= 0) s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (lc >= 0) s = /,\d{1,2}$/.test(s) && (s.match(/,/g) || []).length === 1 ? s.replace(',', '.') : s.replace(/,/g, '');
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) && n > 0 ? n : 0;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'", '#034': '"' };
export const unescapeHtml = s => String(s || '').replace(/&(#\d+|#x[0-9a-f]+|[a-z]+\d*);/gi, (m, e) => {
  const k = e.toLowerCase();
  if (ENT[k] != null) return ENT[k];
  if (k[0] === '#') { const c = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ''; }
  return m;
});

/* Og'irlik → kg. unitCode: KGM, GRM, LBR, ONZ yoki matn (kg, g, lb, oz). */
export function toKg(value, unit) {
  const v = parsePrice(value);
  if (!(v > 0)) return 0;
  const u = String(unit || '').toLowerCase();
  const kg = /^(grm|g|gr|gram|grams|gramm)$/.test(u) ? v / 1000
    : /^(lbr|lb|lbs|pound|pounds)$/.test(u) ? v * 0.4536
    : /^(onz|oz|ounce|ounces)$/.test(u) ? v * 0.02835
    : /^(kgm|kg|kilogram|kilograms|)$/.test(u) ? v : 0;
  return kg > 0 && kg <= 50 ? Math.round(kg * 1000) / 1000 : 0;
}

function metaMap(html) {
  const out = {};
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const key = (/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag) || [])[1];
    const val = (/\bcontent\s*=\s*"([^"]*)"/i.exec(tag) || /\bcontent\s*=\s*'([^']*)'/i.exec(tag) || [])[1];
    if (key && val != null && out[key.toLowerCase()] == null) out[key.toLowerCase()] = unescapeHtml(val).trim();
  }
  return out;
}

function jsonLdBlocks(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1].replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, '').trim();
    try { out.push(JSON.parse(raw)); } catch (e) {
      try { out.push(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, ' '))); } catch (e2) {}
    }
  }
  return out;
}

const isProduct = o => { const t = o && o['@type']; return Array.isArray(t) ? t.some(x => /^(Product|ProductGroup|IndividualProduct|Car|Book)$/i.test(x)) : /^(Product|ProductGroup|IndividualProduct|Car|Book)$/i.test(String(t || '')); };

function findProduct(node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 6) return null;
  if (Array.isArray(node)) { for (const x of node) { const p = findProduct(x, depth + 1); if (p) return p; } return null; }
  if (isProduct(node)) return node;
  for (const k of ['@graph', 'mainEntity', 'itemListElement', 'item', 'hasVariant']) {
    const p = findProduct(node[k], depth + 1);
    if (p) return p;
  }
  return null;
}

/* Taklifdan narx va valyuta: offers obyekt yoki massiv, AggregateOffer
   (lowPrice), priceSpecification; ProductGroup bo'lsa birinchi variant. */
function offerOf(p) {
  const pick = o => {
    if (!o || typeof o !== 'object') return null;
    const spec = Array.isArray(o.priceSpecification) ? o.priceSpecification[0] : o.priceSpecification;
    const price = parsePrice(o.price != null ? o.price : o.lowPrice != null ? o.lowPrice : spec && spec.price);
    const cur = String(o.priceCurrency || (spec && spec.priceCurrency) || '').toUpperCase();
    return price > 0 ? { price, currency: cur } : null;
  };
  const offers = p.offers;
  for (const o of Array.isArray(offers) ? offers : [offers]) {
    const r = pick(o) || (o && Array.isArray(o.offers) ? o.offers.map(pick).find(Boolean) : null);
    if (r) return r;
  }
  if (Array.isArray(p.hasVariant)) for (const v of p.hasVariant) { const r = v && offerOf(v); if (r) return r; }
  return null;
}

/* HTML → { name, price, currency, weightKg, store, category, source } yoki null. */
export function extractProduct(html) {
  const h = String(html || '');
  for (const block of jsonLdBlocks(h)) {
    const p = findProduct(block);
    if (!p) continue;
    const off = offerOf(p);
    if (!off) continue;
    const w = p.weight && typeof p.weight === 'object' ? toKg(p.weight.value, p.weight.unitCode || p.weight.unitText) : toKg(p.weight, 'kg');
    const brand = p.brand && typeof p.brand === 'object' ? p.brand.name : p.brand;
    return { name: unescapeHtml(String(p.name || '')).trim().slice(0, 120), price: off.price, currency: off.currency,
      weightKg: w, store: '', brand: String(brand || '').trim().slice(0, 40), category: String(p.category || '').slice(0, 60), source: 'jsonld' };
  }
  /* Amazon: JSON-LD yo'q — narx bir necha joyda turadi (extractAmazon). */
  const az = extractAmazon(h);
  if (az) return az;
  const meta = metaMap(h);
  const price = parsePrice(meta['product:price:amount'] || meta['og:price:amount'] || meta['price'] || meta['twitter:data1']);
  const cur = String(meta['product:price:currency'] || meta['og:price:currency'] || meta['pricecurrency'] || '').toUpperCase();
  if (price > 0 && /^[A-Z]{3}$/.test(cur)) {
    const title = meta['og:title'] || (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(h) || [])[1] || '';
    return { name: unescapeHtml(title).replace(/\s+/g, ' ').trim().slice(0, 120), price, currency: cur,
      weightKg: 0, store: meta['og:site_name'] || '', brand: '', category: '', source: 'meta' };
  }
  return null;
}

/* Amazon mahsulot sahifasi. Narx bir nechta joyda — birinchi topilgani:
   1) "priceToPay" bloki (asosiy narx), 2) corePrice… / apex_… bloki ichidagi
   birinchi a-offscreen (reklama bloklaridagi narx emas), 3) yashirin
   attach-base-product-price, 4) sahifa JSON'idagi priceAmount /
   displayPrice, 5) eski priceblock_* id'lari, 6) a-price-whole + fraction.
   Nom — productTitle yoki <title>. Valyuta belgisi bo'lmasa bo'sh
   (readLink domendan oladi: amazon.de → EUR). */
const AZ_SYM = [['US$', 'USD'], ['$', 'USD'], ['£', 'GBP'], ['€', 'EUR'], ['¥', 'JPY'], ['₺', 'TRY'], ['AED', 'AED'], ['TL', 'TRY'], ['CAD', 'CAD']];
const azCur = raw => { const r = String(raw || '').trim(); const f = AZ_SYM.find(([k]) => r.startsWith(k) || r.endsWith(k)); return f ? f[1] : ''; };
export function isAmazonPage(h) {
  return /id="productTitle"|<link rel="canonical" href="https?:\/\/(www\.)?amazon\.|"marketplaceId"|id="nav-logo-sprites"/.test(String(h || '').slice(0, 400000));
}
export function extractAmazon(html) {
  const h = String(html || '');
  if (!isAmazonPage(h)) return null;
  const tm = /id="productTitle"[^>]*>([\s\S]{3,400}?)<\/span>/.exec(h) || /<title[^>]*>(?:Amazon\.[a-z.]+\s*:\s*)?([^<]{3,})<\/title>/i.exec(h);
  const name = tm ? unescapeHtml(tm[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s*:\s*Amazon\.[a-z.]+.*$/i, '').trim().slice(0, 120) : '';
  const tries = [];
  const pay = /class="a-price[^"]*priceToPay[^"]*"[^>]*>\s*<span class="a-offscreen">\s*([^<]{1,24})</.exec(h);
  if (pay) tries.push(pay[1]);
  const ci = h.search(/id="(corePrice[A-Za-z_]*|apex_[A-Za-z_]*|tp_price_block[A-Za-z_]*)"/);
  if (ci >= 0) { const m = /class="a-offscreen">\s*([^<]{1,24})</.exec(h.slice(ci, ci + 30000)); if (m) tries.push(m[1]); }
  const at = /id="attach-base-product-price"[^>]*value="([\d.,]+)"/.exec(h);
  if (at) { const sy = /id="attach-base-product-currency-symbol"[^>]*value="([^"]*)"/.exec(h); tries.push((sy ? unescapeHtml(sy[1]) : '') + at[1]); }
  const pa = /"priceAmount"\s*:\s*([\d.]+)/.exec(h);
  if (pa) { const sy = /"currencySymbol"\s*:\s*"([^"]+)"/.exec(h); tries.push((sy ? sy[1] : '') + pa[1]); }
  const dp = /"displayPrice"\s*:\s*"([^"]{1,24})"/.exec(h);
  if (dp) tries.push(dp[1]);
  const pb = /id="priceblock_(?:ourprice|dealprice|saleprice)"[^>]*>\s*([^<]{1,24})</.exec(h);
  if (pb) tries.push(pb[1]);
  if (ci >= 0) {
    const blk = h.slice(ci, ci + 30000);
    const w = /class="a-price-symbol">([^<]*)<[\s\S]{0,200}?class="a-price-whole">([\d.,]+)[\s\S]{0,120}?class="a-price-fraction">(\d+)</.exec(blk);
    if (w) tries.push(w[1] + w[2].replace(/[.,]$/, '') + '.' + w[3]);
  }
  for (const t of tries) {
    const raw = unescapeHtml(t).replace(/ /g, ' ').trim();
    const pr = parsePrice(raw);
    if (pr > 0) return { name, price: pr, currency: azCur(raw), weightKg: 0, store: 'Amazon', brand: '', category: '', source: 'amazon' };
  }
  return null;
}
/* Amazon havolasi: https://www.amazon.X/<nom>/dp/ASIN/ref=…?… →
   https://www.amazon.X/dp/ASIN — sahifa bir xil, ortiqcha yo'naltirish va
   kuzatuv yo'q. Boshqa havola o'zgarmaydi. */
export function amazonClean(href) {
  let x; try { x = new URL(href); } catch (e) { return href; }
  if (!/(^|\.)amazon\.[a-z.]+$/i.test(x.hostname)) return href;
  const m = /\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/ASIN)\/([A-Z0-9]{10})(?:[/?]|$)/i.exec(x.pathname + '/');
  return m ? x.origin + '/dp/' + m[1].toUpperCase() : href;
}
/* Jonli tekshiruv uchun: Amazon sahifasida qaysi narx belgilari bor. */
export function amazonMarkers(html) {
  const h = String(html || '');
  if (!isAmazonPage(h)) return null;
  return { title: /id="productTitle"/.test(h), priceToPay: /priceToPay/.test(h), core: /id="(corePrice|apex_)/.test(h), attach: /attach-base-product-price/.test(h),
    priceAmount: /"priceAmount"/.test(h), offscreen: (h.match(/class="a-offscreen"/g) || []).length,
    unavailable: /currently unavailable|out of stock|mavjud emas/i.test(h), location: /glow-ingress|deliver to/i.test(h) };
}

/* Arzon modelga beriladigan sahifa matni: sarlavha, tavsif va ko'rinadigan
   matn (skript, uslub, svg olib tashlanadi), 12 000 belgigacha. */
export function pageText(html) {
  const h = String(html || '');
  const meta = metaMap(h);
  const title = unescapeHtml((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(h) || [])[1] || '').replace(/\s+/g, ' ').trim();
  /* Mahsulot qismidan boshlanadi (menyu va reklama emas): productTitle,
     <main> yoki itemprop="name" bo'lsa — o'sha joydan. */
  const start = Math.max(0, h.search(/id="productTitle"|<main\b|itemprop="name"|id="centerCol"/));
  const body = unescapeHtml(h.slice(start)
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
  return [title && 'Sarlavha: ' + title, meta['og:title'] && meta['og:title'] !== title ? 'OG: ' + meta['og:title'] : '',
    meta['description'] ? 'Tavsif: ' + meta['description'] : '', body].filter(Boolean).join('\n').slice(0, TEXT_MAX);
}

/* Domen oxiri → davlat (kuryer tarifi bor ro'yxat nomlarida). .com — noma'lum:
   ilova valyutadan taxmin qiladi. */
export function tldCountry(host) {
  const h = String(host || '').toLowerCase();
  const map = [[/\.(cn|com\.cn|hk)$/, 'Xitoy'], [/\.(com\.)?tr$/, 'Turkiya'], [/\.(co\.)?uk$/, 'Angliya'], [/\.de$/, 'Germaniya'],
    [/\.(co\.)?kr$/, 'Koreya'], [/\.ae$/, 'BAA'], [/\.ru$/, 'Rossiya']];
  for (const [re, c] of map) if (re.test(h)) return c;
  return '';
}

/* Narxda valyuta yozilmagan bo'lsa — domen oxiridan (bo'lmasa bo'sh:
   normalizeShot USD deb oladi). */
export function tldCurrency(host) {
  const h = String(host || '').toLowerCase();
  const map = [[/\.(cn|com\.cn)$/, 'CNY'], [/\.(com\.)?tr$/, 'TRY'], [/\.(co\.)?uk$/, 'GBP'], [/\.(de|fr|it|es|nl|at|be|fi|ie|pt)$/, 'EUR'],
    [/\.(co\.)?kr$/, 'KRW'], [/\.ae$/, 'AED'], [/\.ru$/, 'RUB'], [/\.(co\.)?jp$/, 'JPY']];
  for (const [re, c] of map) if (re.test(h)) return c;
  return '';
}

/* Sayt o'zi "odam emasmisiz?" sahifasini qaytardimi (Amazon, Cloudflare). */
export const looksBlocked = html => /captcha|are you a (human|robot)|robot check|access denied|cf-chl-|attention required|continue shopping|automated access|api-services-support@amazon|characters you see|verify you are human|px-captcha|datadome/i.test(String(html || '').slice(0, 30000));

/* Narxi sahifaga keyin JavaScript bilan yuklanadigan do'konlar. AliExpress
   HTML'ida faqat nom (og:title) bor — narx yo'q (2026-10-02 tekshiruvi).
   Bunday sahifada AI matn o'qish ham, web_fetch ham narx topmaydi: pul
   sarflanmaydi, nom bilan "narx o'qilmadi" qaytadi. */
export const JS_PRICE = /(^|\.)aliexpress\.(com|us|ru)$/i;

/* Serverlarga captcha ko'rsatadigan do'konlar: Trendyol (Cloudflare,
   sahifa ham, API ham 403). web_fetch (Anthropic serveri) ham o'tolmadi —
   2026-10-02 jonli sinovi: 13 s, ~$0.035, narx yo'q. Bularda web_fetch
   chaqirilmaydi: nom havoladan, narx ulashish matni yoki skrinshotdan. */
export const BOT_WALL = /(^|\.)trendyol\.com$/i;

/* Sahifa nomi: og:title yoki <title>, oxiridagi " - AliExpress 2017…",
   " | Trendyol" kabi do'kon dumisiz. */
export function pageName(html) {
  const h = String(html || '');
  const meta = metaMap(h);
  const t = meta['og:title'] || (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(h) || [])[1] || '';
  return unescapeHtml(t).replace(/\s+/g, ' ')
    .replace(/\s*[-|–—:]\s*(AliExpress|Trendyol|Amazon(\.[a-z.]+)?|eBay|Temu|SHEIN)\b.*$/i, '').trim().slice(0, 120);
}

/* Havoladagi nom va ulashish matni — core/share.js (ilova ham shuni
   ishlatadi, natija ikki joyda bir xil). */
export const slugName = href => globalThis.PochtamCore.slugName(href);
export const shareHint = text => globalThis.PochtamCore.shareHint(text);
