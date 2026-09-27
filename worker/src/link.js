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

/* Sahifani yuklaydi: vaqt va hajm chegarasi bilan. Javob:
   { ok, status, html, url } — ok faqat 2xx va HTML bo'lsa. */
export async function fetchPage(url, fetchFn, ms = LINK_TIMEOUT_MS) {
  const init = {
    method: 'GET', redirect: 'follow',
    headers: {
      /* Desktop sahifa: mobil versiyada narx bloklari boshqa nomda va
         kamroq tuzilgan ma'lumot bo'ladi. */
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 PochtamLinkReader/1.0',
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
      'accept-language': 'en-US,en;q=0.8,ru;q=0.6'
    }
  };
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(ms);
  let res;
  try { res = await fetchFn(url, init); } catch (e) { return { ok: false, status: 0, html: '', url }; }
  const ct = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
  const finalUrl = res.url || url;
  if (!res.ok || (ct && !/html|xml/i.test(ct))) {
    try { if (res.body && res.body.cancel) await res.body.cancel(); } catch (e) {}
    return { ok: false, status: res.status || 0, html: '', url: finalUrl };
  }
  let html = '';
  if (res.body && typeof res.body.getReader === 'function') {
    const rd = res.body.getReader(), dec = new TextDecoder('utf-8');
    let n = 0;
    for (;;) {
      let chunk;
      try { chunk = await rd.read(); } catch (e) { break; }
      if (chunk.done) break;
      n += chunk.value.byteLength;
      html += dec.decode(chunk.value, { stream: true });
      if (n >= LINK_MAX_BYTES) { try { await rd.cancel(); } catch (e) {} break; }
    }
  } else {
    try { html = String(await res.text()).slice(0, LINK_MAX_BYTES); } catch (e) { html = ''; }
  }
  return { ok: html.length > 0, status: res.status || 200, html, url: finalUrl };
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
  /* Amazon: JSON-LD yo'q, narx asosiy narx blokida (corePrice…) — birinchi
     a-offscreen shu blok ichidan olinadi (reklama bloklaridagi narx emas). */
  const ci = h.search(/id="(corePrice[A-Za-z_]*|apex_[A-Za-z_]*|priceblock_[A-Za-z_]*|tp_price_block[A-Za-z_]*)"/);
  const at = /id="(?:productTitle|title)"[^>]*>(?:\s*<span[^>]*>)?([^<]{3,})</.exec(h)
    || (/amazon\./i.test((/<link rel="canonical" href="([^"]+)"/.exec(h) || [])[1] || '') ? /<title[^>]*>(?:Amazon\.[a-z.]+:\s*)?([^<]{3,})<\/title>/i.exec(h) : null);
  if (ci >= 0 && at) {
    const pm = /class="a-offscreen">\s*([^<]{1,24})</.exec(h.slice(ci, ci + 30000));
    const raw = pm ? unescapeHtml(pm[1]).trim() : '';
    const sym = { '$': 'USD', '£': 'GBP', '€': 'EUR', '¥': 'JPY', '₺': 'TRY', 'AED': 'AED' };
    const cur = (Object.keys(sym).find(k => raw.startsWith(k) || raw.endsWith(k)) || '');
    const pr = parsePrice(raw);
    if (pr > 0 && cur) return { name: unescapeHtml(at[1]).replace(/\s+/g, ' ').trim().slice(0, 120), price: pr, currency: sym[cur], weightKg: 0, store: 'Amazon', brand: '', category: '', source: 'amazon' };
  }
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

/* Sayt o'zi "odam emasmisiz?" sahifasini qaytardimi (Amazon, Cloudflare). */
export const looksBlocked = html => /captcha|are you a (human|robot)|robot check|access denied|cf-chl-|attention required|continue shopping|automated access|api-services-support@amazon|characters you see|verify you are human|px-captcha|datadome/i.test(String(html || '').slice(0, 30000));
