/* Pochtam AI — POST /ai. Claude API'ga proksi: kalit Cloudflare sirida
 * (ANTHROPIC_API_KEY), brauzerga hech qachon tushmaydi. Javob qoidalari
 * data/ai-rules.md dan, faktlar ilovaning o'z ro'yxatlaridan
 * (kb.generated.js), hisob-kitob esa faqat vositalar orqali — vositalar
 * ilovadagi core/ modullarini chaqiradi, shuning uchun AI raqamni "to'qiy"
 * olmaydi: boj, kargo va jami narx ilovadagi kalkulyator bilan bir xil.
 *
 * So'rov:  { q, history?: [{role:'user'|'assistant', text}], lang?, usdRate? }
 * Javob:   { text, tools:[{name, input, result}], model, usage, stop }
 * Xatolar: 400 (kirish), 403 (begona Origin), 429 (kunlik chegara, code:'limit'),
 *          503 (kalit yo'q yoki Claude API javob bermadi, code:'no_key'|'upstream').
 * Cheklovlar: IP uchun kuniga AI_DAILY_PER_IP savol (IP saqlanmaydi — kun
 * va sir bilan tuzlangan xesh), hammasi uchun AI_DAILY_TOTAL.
 *
 * Claude API'ga Anthropic SDK'siz, oddiy fetch bilan murojaat qilinadi:
 * Worker'da qo'shimcha bog'liqlik yo'q (bundle kichik) va so'rov shakli
 * ikki chaqiruvdan iborat (xabar → vosita natijasi → xabar). */

import '../../core/customs.js';
import '../../core/tariffs.js';
import '../../core/landed.js';
import * as KB from './kb.generated.js';

const Core = globalThis.PochtamCore;
export const AI_LIMITS = { q: 600, hist: 6, histText: 800, body: 12288, rounds: 4 };
const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5';
const FALLBACK_RATE = 12700;

const num = v => { const x = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/\s/g, '')); return isFinite(x) ? x : 0; };
const pos = v => Math.max(0, num(v));
const r2 = v => Math.round(num(v) * 100) / 100;
const r0 = v => Math.round(num(v));
const isoDay = (d = new Date()) => d.toISOString().slice(0, 10);
const norm = s => String(s || '').toLowerCase().replace(/[‘’'`ʻʼ]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
const LEVEL = { red: 'taqiqlangan', amber: 'cheklangan (ruxsat/sertifikat yoki maxsus tartib)' };

/* --- Tizim ko'rsatmasi: qoidalar + bilimlar bazasi. Kun va til alohida
   blokda, oxirida turadi, shunda asosiy matn Claude keshida qoladi. --- */
/* Tizim ko'rsatmasi har so'rovda qayta yuboriladi, shuning uchun unda
   faqat INDEKS turadi: model nima borligini bilib, kerakli vositani
   chaqirsin. Tafsilot vositalardan keladi va u yerda baza to'liq:
   do'konning qaytarish sharti, murakkabligi, turi va domeni —
   `find_store`; taqiqning qonuniy manbasi va izohi — `check_banned`;
   kuryer summasi, muddati va kuzatuvi — `courier_quotes`. Ilgari
   bularning hammasi matn bo'lib har chaqiruvda ketardi (12 400 token);
   indeksda ~7 200. Maydon qo'shishdan oldin o'ylab ko'ring: uni
   vosita qaytara oladimi? */
export function buildSystem() {
  const cur = Core.normsAt(KB.NORMS, isoDay()) || {};
  const couriers = KB.COURIERS.map(c => ({ name: c.name, countries: c.countries, days: c.days, mode: c.mode, tracking: c.tracking }));
  const stores = KB.STORES.map(s => ({ name: s.name, country: (s.from || [s.country]).join('/'), cat: s.cat, price: s.price, original: s.original, direct: s.direct }));
  const banned = KB.BANNED.map(b => ({ name: b.name, level: LEVEL[b.level] || b.level }));
  return [
    KB.RULES.trim(),
    '## Joriy me\'yor (NORMS)\n' + JSON.stringify(cur),
    '## Kuryerlar indeksi (' + couriers.length + ') — summa, muddat va cheklov uchun courier_quotes\n' + JSON.stringify(couriers),
    '## Kuryer tarifi bor davlatlar\n' + KB.COUNTRIES.join(', '),
    '## Do\'konlar indeksi (' + stores.length + ') — qaytarish, murakkablik, tur va domen uchun find_store\n' + JSON.stringify(stores),
    '## Taqiq va cheklovlar indeksi — qonuniy manba va izoh uchun check_banned\n' + JSON.stringify(banned),
    '## Kategoriyalar (taxminiy vazn kg/dona)\n' + JSON.stringify(KB.CATEGORIES.map(c => ({ id: c.id, kgPerItem: c.kgPerItem, caution: c.caution }))),
    '## Xizmatlar (pullik konsultatsiya)\n' + JSON.stringify(KB.SERVICES.map(s => ({ title: s.title, sub: s.sub, lane: s.lane }))),
    '## Qo\'llanmalar\n' + JSON.stringify(KB.GUIDES)
  ].join('\n\n');
}

/* --- Vositalar: hisob faqat core/ orqali. --- */
export const TOOLS = [
  {
    name: 'customs_duty',
    description: 'Bojxona to\'lovi (yagona boj) va rasmiylashtirish yig\'imini hisoblaydi — ilovadagi kalkulyator formulasi. Boj yoki yig\'im haqida har qanday raqam kerak bo\'lganda chaqiriladi.',
    input_schema: {
      type: 'object',
      properties: {
        goodsUsd: { type: 'number', description: 'Tovar qiymati, USD (ichki yetkazish bilan)' },
        shipUsd: { type: 'number', description: 'Xalqaro kargo summasi, USD (noma\'lum bo\'lsa 0)' },
        kg: { type: 'number', description: 'Hisob og\'irligi, kg (haqiqiy yoki hajmiy, kattasi)' },
        monthUsd: { type: 'number', description: 'Shu oyda avval kelgan jo\'natmalar qiymati, USD (bo\'lmasa 0)' }
      },
      required: ['goodsUsd']
    }
  },
  {
    name: 'courier_quotes',
    description: 'Berilgan davlat va og\'irlik uchun kuryerlarning taxminiy summasi va muddati (kuryer saytidagi tariflardan). Kuryer tanlash, "qaysi arzon/tez" savollarida chaqiriladi.',
    input_schema: {
      type: 'object',
      properties: {
        country: { type: 'string', description: 'Qaysi davlatdan: ' + KB.COUNTRIES.join(', ') },
        kg: { type: 'number', description: 'Og\'irlik, kg' },
        priority: { type: 'string', enum: ['cheap', 'fast', 'optimal'], description: 'Tartib: arzon, tez yoki optimal' }
      },
      required: ['country', 'kg']
    }
  },
  {
    name: 'landed_cost',
    description: 'Jami tannarx: tovar + ichki yetkazish + eng arzon kuryer kargo + boj + yig\'im. "Hammasi bo\'lib qancha tushadi", "olish foydalimi" savollarida chaqiriladi.',
    input_schema: {
      type: 'object',
      properties: {
        priceUsd: { type: 'number', description: 'Bitta mahsulot narxi, USD' },
        qty: { type: 'integer', description: 'Miqdor (1)' },
        kg: { type: 'number', description: 'Bitta mahsulot og\'irligi, kg (noma\'lum bo\'lsa kategoriya bo\'yicha taxmin)' },
        category: { type: 'string', description: 'Kategoriya id (vazn noma\'lum bo\'lsa taxmin uchun)' },
        country: { type: 'string', description: 'Qaysi davlatdan' },
        domesticUsd: { type: 'number', description: 'Do\'kon ichidagi yetkazish, USD (0)' },
        dims: { type: 'object', description: 'Quti o\'lchami, sm', properties: { l: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } } },
        localPriceUzs: { type: 'number', description: 'O\'zbekistondagi narx, so\'m ("foydalimi" uchun)' },
        monthUsd: { type: 'number', description: 'Shu oyda avval kelgan jo\'natmalar qiymati, USD' }
      },
      required: ['priceUsd', 'country']
    }
  },
  {
    name: 'check_banned',
    description: 'Tovar taqiqlangan yoki cheklanganmi — ilovadagi ro\'yxat bo\'yicha tekshiradi. "Olib kelsa bo\'ladimi" savollarida chaqiriladi.',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Tovar nomi (o\'zbek yoki rus)' } }, required: ['query'] }
  },
  {
    name: 'find_store',
    description: 'Do\'konni nom, domen, kategoriya yoki davlat bo\'yicha bazadan topadi.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
  },
  {
    name: 'suggest_stores',
    description: 'Mahsulot so\'rovi ("krossovka, erkaklar, original, 41, $100 gacha") uchun mos do\'konlar: kategoriya, originallik va byudjetga qarab bazadan tanlaydi va har biriga qidiruv havolasi beradi. Foydalanuvchi biror narsa sotib olmoqchi bo\'lsa chaqiriladi.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['kiyim va moda', 'poyabzal', 'elektronika', 'kosmetika', 'bolalar', 'universal'], description: 'Kategoriya' },
        original: { type: 'boolean', description: 'Faqat original/brend kerakmi' },
        budgetUsd: { type: 'number', description: 'Byudjet, USD (bo\'lmasa 0)' },
        query: { type: 'string', description: 'Do\'kon qidiruviga yoziladigan inglizcha so\'rov, masalan "men sneakers size 41"' }
      },
      required: ['category', 'query']
    }
  }
];

/* Aniq mahsulot havolalari: model veb-qidiruvdan topgan sahifalarni shu
   vosita orqali qaytaradi — ilova ularni karta qilib chizadi. Vosita hech
   narsa hisoblamaydi, faqat tekshiradi: https, nom, do'kon, narx. */
TOOLS.push({
  name: 'product_links',
  description: 'Veb-qidiruvdan topilgan ANIQ mahsulot sahifalari (qidiruv natijalari ro\'yxati emas): 3–5 ta havola, har biriga nom, do\'kon va sahifadagi narx. Faqat "Qayerdan topaman" rejimida, web_search dan keyin chaqiriladi.',
  input_schema: {
    type: 'object',
    properties: {
      links: { type: 'array', maxItems: 5, items: { type: 'object', properties: {
        title: { type: 'string', description: 'Mahsulot nomi sahifadagidek' },
        url: { type: 'string', description: 'Mahsulot sahifasining to\'liq https manzili' },
        store: { type: 'string', description: 'Do\'kon nomi' },
        price: { type: 'number', description: 'Sahifadagi narx raqami (ko\'rinmasa 0)' },
        currency: { type: 'string', description: 'Valyuta kodi (USD, EUR, GBP, TRY, CNY…)' }
      }, required: ['title', 'url', 'store'] } }
    },
    required: ['links']
  }
});
/* Veb-qidiruv — serverda bajariladigan vosita; faqat "find" so'rovlarida
   qo'shiladi (har qidiruv alohida to'lanadi). */
export const WEB_SEARCH_TOOL = { type: 'web_search_20260209', name: 'web_search', max_uses: 2 };
export function toolLinks(inp) {
  const seen = new Set(); const out = [];
  for (const l of Array.isArray(inp.links) ? inp.links : []) {
    if (!l || typeof l !== 'object') continue;
    const url = String(l.url || '').trim();
    if (!/^https:\/\/[^\s"'<>]+$/i.test(url) || url.length > 400) continue;
    let host = ''; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { continue; }
    const key = url.replace(/[?#].*$/, '');
    if (seen.has(key)) continue; seen.add(key);
    out.push({ title: String(l.title || '').trim().slice(0, 90) || host, url, host,
      store: String(l.store || '').trim().slice(0, 40) || host,
      price: pos(l.price) || 0, currency: String(l.currency || '').toUpperCase().slice(0, 3) });
    if (out.length >= 5) break;
  }
  return { ok: out.length > 0, links: out, n: out.length };
}

/* Do'kon qidiruv havolalari: {q} o'rniga inglizcha so'rov. Faqat ochiq va
   ishonchli shablonlar; qolgan do'konlarda do'kon manzilining o'zi. */
const SEARCH_URL = {
  amazon: 'https://www.amazon.com/s?k={q}', ebay: 'https://www.ebay.com/sch/i.html?_nkw={q}',
  trendyol: 'https://www.trendyol.com/sr?q={q}', aliexpress: 'https://www.aliexpress.com/w/wholesale-{q}.html',
  shein: 'https://www.shein.com/pdsearch/{q}/', taobao: 'https://s.taobao.com/search?q={q}',
  walmart: 'https://www.walmart.com/search?q={q}', asos: 'https://www.asos.com/search/?q={q}',
  nike: 'https://www.nike.com/w?q={q}', adidas: 'https://www.adidas.com/us/search?q={q}',
  puma: 'https://us.puma.com/us/en/search?q={q}', newbalance: 'https://www.newbalance.com/search?q={q}',
  footlocker: 'https://www.footlocker.com/search?query={q}', jdsports: 'https://www.jdsports.com/search/{q}/',
  zara: 'https://www.zara.com/us/en/search?searchTerm={q}', hm: 'https://www2.hm.com/en_us/search-results.html?q={q}',
  uniqlo: 'https://www.uniqlo.com/us/en/search?q={q}', bestbuy: 'https://www.bestbuy.com/site/searchpage.jsp?st={q}',
  newegg: 'https://www.newegg.com/p/pl?d={q}', sephora: 'https://www.sephora.com/search?keyword={q}',
  ulta: 'https://www.ulta.com/search?search={q}', lego: 'https://www.lego.com/en-us/search?q={q}',
  noon: 'https://www.noon.com/uae-en/search/?q={q}', farfetch: 'https://www.farfetch.com/shopping/search/items.aspx?q={q}',
  mytheresa: 'https://www.mytheresa.com/us/en/search?q={q}', jomashop: 'https://www.jomashop.com/search?q={q}'
};
export function searchUrl(store, q) {
  const t = SEARCH_URL[store.id];
  const query = encodeURIComponent(String(q || '').trim()).replace(/%20/g, '+');
  return t && query ? t.replace('{q}', query) : (store.url || '');
}
const PRICE_RANK = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };

/* Mahsulot so'rovi uchun do'konlar: kategoriya, originallik va byudjetga
   qarab bazadan tanlanadi, qidiruv havolasi bilan. Reyting: originallik
   talab qilinsa "Yuqori" birinchi; byudjet past bo'lsa arzon segment. */
function toolSuggest(inp) {
  const cat = String(inp.category || '').trim();
  const wantOrig = !!inp.original;
  const budget = pos(inp.budgetUsd);
  const q = String(inp.query || '').trim().slice(0, 80);
  /* Byudjet → narx segmenti: $35 gacha "$", $80 gacha "$$", $400 gacha "$$$". */
  const maxRank = budget > 0 ? (budget < 35 ? 1 : budget < 80 ? 2 : budget < 400 ? 3 : 4) : 4;
  const scored = KB.STORES.map(s => {
    let sc = 0;
    /* Kategoriya hal qiluvchi: aynan mos do'kon universal marketplace'dan ancha oldinda. */
    if (cat && s.cat === cat) sc += 6; else if (s.cat === 'universal') sc += 1; else if (cat) return null;
    const orig = /Yuqori/i.test(s.original || '');
    if (wantOrig) sc += orig ? 3 : 0; else sc += orig ? 0 : 1;
    const pr = PRICE_RANK[s.price] || 2;
    if (pr <= maxRank) sc += 2; else sc -= (pr - maxRank) * 2;
    if (s.direct) sc += 1;
    if (KB.GUIDES.some(g => g.id === s.id)) sc += 1;
    if (SEARCH_URL[s.id]) sc += 1;
    return { s, sc };
  }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 5);
  if (!scored.length) return { found: false, note: 'Bu kategoriya uchun bazada do\'kon yo\'q.' };
  return {
    found: true, query: q,
    stores: scored.map(({ s }) => ({
      id: s.id, name: s.name, country: s.country, from: s.from || [s.country], cat: s.cat, price: s.price, original: s.original,
      direct: !!s.direct, complexity: s.complexity, guide: KB.GUIDES.some(g => g.id === s.id),
      searchUrl: searchUrl(s, q)
    })),
    note: wantOrig ? 'Original talab qilinsa "Yuqori" originallikdagi do\'konlar birinchi; marketplace\'larda originallik sotuvchiga bog\'liq — sotuvchi reytingini tekshirish kerak.' : ''
  };
}

function findCategoryKg(cat) {
  const c = KB.CATEGORIES.find(x => x.id === cat) || KB.CATEGORIES.find(x => x.id === 'universal');
  return c ? c.kgPerItem : 1;
}

function toolCustoms(inp, ctx) {
  const norms = Core.normsAt(KB.NORMS, ctx.today) || {};
  const freeLeft = Math.max(0, num(norms.freeUsd) - pos(inp.monthUsd));
  const r = Core.customsDuty({ goodsUsd: pos(inp.goodsUsd), shipUsd: pos(inp.shipUsd), kg: pos(inp.kg), freeUsd: freeLeft, norms, usdRate: ctx.usdRate });
  return {
    freeUsdLeft: r2(freeLeft), excessGoodsUsd: r2(r.excessGoods), customsValueUsd: r2(r.cv),
    dutyUsd: r2(r.dutyUsd), dutyUzs: r0(r.dutyUzs), feeUzs: r0(r.feeUzs), totalUzs: r0(r.totalUzs),
    basis: r.basis === 'none' ? 'me\'yor ichida — to\'lov yo\'q' : r.basis === 'weight' ? 'vazn bo\'yicha ($/kg ustun keldi)' : 'qiymatning foizi',
    usdRate: ctx.usdRate, norms: { freeUsd: norms.freeUsd, dutyPct: norms.dutyPct, minPerKg: norms.minPerKg, feeShare: norms.feeShare, bhm: norms.bhm, src: norms.src }
  };
}

function knownCountry(country) {
  const k = Core.countryKey(country);
  return k ? KB.COUNTRIES.find(c => Core.countryKey(c) === k) : null;
}

/* usdRate — so'mda yozilgan tariflar (UZS) dollarga o'girilishi uchun;
   bo'lmasa o'sha kuryerlar "so'rov bo'yicha" ro'yxatiga tushib qolardi. */
function quotesFor(country, kg, priority, usdRate) {
  const all = Core.courierQuotes({ couriers: KB.COURIERS, tariffs: KB.TARIFFS, country, kg, usdRate, minKg: 0.5 });
  const ranked = Core.rankQuotes(all, priority || 'cheap');
  return { ok: ranked.filter(q => q.ok), rest: ranked.filter(q => !q.ok) };
}

function toolQuotes(inp, ctx) {
  const country = String(inp.country || '').trim(), kg = pos(inp.kg);
  if (!country || !(kg > 0)) return { error: 'davlat va og\'irlik kerak' };
  const known = knownCountry(country);
  if (!known) return { error: 'bu davlat uchun tarif yo\'q', countries: KB.COUNTRIES };
  const { ok, rest } = quotesFor(known, kg, inp.priority, ctx.usdRate);
  return {
    country: known, kg, priority: inp.priority || 'cheap',
    quotes: ok.slice(0, 6).map(q => ({ courier: q.name, usd: r2(q.usd), days: q.days || null, mode: q.mode, tracking: q.tracking, tariff: q.text })),
    onRequest: [...new Set(rest.map(q => q.name))],
    note: 'Kuryer saytidagi tarif bo\'yicha taxminiy summa; ombor xizmati, qadoqlash va sug\'urta alohida.'
  };
}

function toolLanded(inp, ctx) {
  if (!(pos(inp.priceUsd) > 0)) return { error: 'mahsulot narxi kerak' };
  const known = knownCountry(String(inp.country || '').trim());
  if (!known) return { error: 'bu davlat uchun kuryer tarifi yo\'q', countries: KB.COUNTRIES };
  const qty = Math.max(1, Math.round(pos(inp.qty) || 1));
  const kgGuess = !(pos(inp.kg) > 0);
  const kg = kgGuess ? findCategoryKg(inp.category) : pos(inp.kg);
  const dims = inp.dims && pos(inp.dims.l) > 0 ? { l: pos(inp.dims.l), w: pos(inp.dims.w), h: pos(inp.dims.h) } : null;
  const volKg = dims ? Core.volumetricKg(dims.l, dims.w, dims.h) : 0;
  const billKg = Core.billableKg(kg * qty, volKg);
  const { ok } = quotesFor(known, billKg, 'cheap', ctx.usdRate);
  const best = ok[0] || null;
  const norms = Core.normsAt(KB.NORMS, ctx.today) || {};
  const freeLeft = Math.max(0, num(norms.freeUsd) - pos(inp.monthUsd));
  const L = Core.landedCost({ priceUsd: pos(inp.priceUsd), qty, domesticUsd: pos(inp.domesticUsd), kg, dims, shipUsd: best ? best.usd : 0,
    freeUsd: freeLeft, norms, usdRate: ctx.usdRate, localPriceUzs: pos(inp.localPriceUzs) || null });
  const out = {
    country: known, qty, kgPerItem: kg, kgGuessed: kgGuess, billableKg: r2(L.billKg), volumetricKg: r2(L.volKg),
    courier: best ? { name: best.name, usd: r2(best.usd), days: best.days || null } : null,
    goodsUsd: r2(L.goodsUsd), domesticUsd: r2(L.domesticUsd), shipUsd: r2(L.shipUsd), dutyUsd: r2(L.dutyUsd), feeUzs: r0(L.feeUzs),
    totalUsd: r2(L.totalUsd), totalUzs: r0(L.totalUzs), usdRate: ctx.usdRate,
    note: best ? 'Kargo — eng arzon kuryer tarifi bo\'yicha.' : 'Bu yo\'nalishda tarifli kuryer topilmadi — kargo 0 deb olindi.'
  };
  if (L.localPriceUzs > 0) { out.localPriceUzs = r0(L.localPriceUzs); out.savingUzs = r0(L.savingUzs); out.worth = !!L.worth; }
  return out;
}

function toolBanned(inp) {
  const q = norm(inp.query);
  if (!q) return { error: 'tovar nomi kerak' };
  const words = q.split(' ').filter(w => w.length > 2);
  const hits = KB.BANNED.map(b => {
    const hay = norm(b.name + ' ' + (b.syn || ''));
    const score = words.reduce((a, w) => a + (hay.includes(w) ? 1 : 0), 0) + (hay.includes(q) ? 2 : 0);
    return { b, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  if (!hits.length) return { found: false, note: 'Ro\'yxatda topilmadi. Bu ruxsat degani emas — kuryerning o\'z cheklovlari bo\'lishi mumkin.' };
  return { found: true, items: hits.map(({ b }) => ({ name: b.name, level: LEVEL[b.level] || b.level, src: b.src, note: b.note })) };
}

function toolStore(inp) {
  const q = norm(inp.query);
  if (!q) return { error: 'so\'rov kerak' };
  const words = q.split(' ').filter(Boolean);
  const hits = KB.STORES.map(s => {
    const hay = norm([s.name, s.domain, s.country, s.cat, s.subcats, s.type, (s.tags || []).join(' ')].join(' '));
    const score = (norm(s.name) === q || (s.domain || '').includes(q) ? 5 : 0) + words.reduce((a, w) => a + (hay.includes(w) ? 1 : 0), 0);
    return { s, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  if (!hits.length) return { found: false, note: 'Bazada bunday do\'kon yo\'q.' };
  return { found: true, stores: hits.map(({ s }) => ({ ...s, guide: KB.GUIDES.some(g => g.id === s.id) })) };
}

export function runTool(name, input, ctx) {
  const inp = input && typeof input === 'object' ? input : {};
  try {
    if (name === 'customs_duty') return toolCustoms(inp, ctx);
    if (name === 'courier_quotes') return toolQuotes(inp, ctx);
    if (name === 'landed_cost') return toolLanded(inp, ctx);
    if (name === 'check_banned') return toolBanned(inp);
    if (name === 'find_store') return toolStore(inp);
    if (name === 'suggest_stores') return toolSuggest(inp);
    if (name === 'product_links') return toolLinks(inp);
    return { error: 'noma\'lum vosita: ' + name };
  } catch (e) {
    return { error: 'hisoblab bo\'lmadi: ' + (e && e.message || e) };
  }
}

/* --- So'rovni tekshirish. Xato bo'lsa satr, aks holda tozalangan obyekt. --- */
export function parseAiBody(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { return 'JSON kutilgan edi'; }
  if (!d || typeof d !== 'object') return 'obyekt kutilgan edi';
  const q = String(d.q == null ? '' : d.q).replace(/[\x00-\x08\x0b-\x1f]/g, '').trim();
  if (!q) return 'savol bo\'sh';
  if (q.length > AI_LIMITS.q) return 'savol ' + AI_LIMITS.q + ' belgidan uzun';
  const lang = ['uz', 'uzc', 'ru'].includes(d.lang) ? d.lang : 'uz';
  const hist = [];
  for (const h of Array.isArray(d.history) ? d.history.slice(-AI_LIMITS.hist) : []) {
    if (!h || (h.role !== 'user' && h.role !== 'assistant')) continue;
    const t = String(h.text == null ? '' : h.text).trim().slice(0, AI_LIMITS.histText);
    if (!t) continue;
    /* Rollar navbat bilan bo'lishi kerak: ketma-ket bir xil rol qo'shiladi. */
    if (hist.length && hist[hist.length - 1].role === h.role) hist[hist.length - 1].text += '\n' + t;
    else hist.push({ role: h.role, text: t });
  }
  while (hist.length && hist[0].role !== 'user') hist.shift();
  if (hist.length && hist[hist.length - 1].role === 'user') hist.pop();
  const usdRate = num(d.usdRate);
  return { q, lang, history: hist, usdRate: usdRate >= 5000 && usdRate <= 50000 ? usdRate : 0, find: d.find === true };
}

const LANG_NAME = { uz: 'o\'zbek (lotin)', uzc: 'o\'zbek (kirill)', ru: 'rus' };

async function ipKey(request, env, today) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
  const data = new TextEncoder().encode(ip + '|' + today + '|' + (env.READ_TOKEN || env.ANTHROPIC_API_KEY || ''));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Bitta Claude chaqiruvi. Muvaffaqiyatsiz bo'lsa { error, status } qaytadi,
   tashlamaydi — chaqiruvchi 503 beradi va sanaydi. */
async function callClaude(body, env, fetchImpl) {
  const headers = { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' };
  const init = { method: 'POST', headers, body: JSON.stringify(body) };
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(+env.AI_TIMEOUT_MS || 50000);
  let res;
  try { res = await fetchImpl(API_URL, init); } catch (e) { return { error: 'tarmoq: ' + (e && e.message || e), status: 0 }; }
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) return { error: (data && data.error && data.error.message) || ('HTTP ' + res.status), status: res.status, type: data && data.error && data.error.type };
  return { data };
}

/* /ai va /ai/shot uchun umumiy darvoza: Origin, kalit, tana hajmi. Xato
   bo'lsa { res } (tayyor Response), aks holda { text, json, count, limit }.
   Kunlik chegara `limit()` bilan — chaqiruvchi kirishni tekshirgach chaqiradi,
   shunda noto'g'ri so'rov kvotani yemaydi. */
async function gate({ request, env, ctx, origin, originOk, cors, counter, maxBody }) {
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: cors(env, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, origin) });
  const count = key => { if (counter && ctx) ctx.waitUntil(counter.fetch('https://counter/add', { method: 'POST', body: JSON.stringify([{ day: isoDay(), name: 'ai', key, n: 1 }]) }).catch(() => {})); };
  if (!originOk) return { res: json({ error: 'ruxsat yo\'q' }, 403) };
  if (!env.ANTHROPIC_API_KEY) { count('no_key'); return { res: json({ error: 'AI vaqtincha mavjud emas', code: 'no_key' }, 503) }; }
  const len = +(request.headers.get('content-length') || 0);
  if (len > maxBody) return { res: json({ error: 'so\'rov juda katta', code: 'bad_input' }, 413) };
  const text = await request.text();
  if (text.length > maxBody) return { res: json({ error: 'so\'rov juda katta', code: 'bad_input' }, 413) };
  /* Kunlik chegara: IP xeshi (kun + sir bilan tuzlangan, qayta tiklanmaydi) va umumiy. */
  const limit = async () => {
    if (!counter) return null;
    const key = await ipKey(request, env, isoDay());
    const perIp = +env.AI_DAILY_PER_IP || 20, total = +env.AI_DAILY_TOTAL || 300;
    let lim = { ok: true };
    try { lim = await (await counter.fetch('https://counter/limit', { method: 'POST', body: JSON.stringify({ key, max: perIp, total }) })).json(); } catch (e) { lim = { ok: true }; }
    if (lim.ok) return null;
    count('limit');
    return json({ error: 'Bugungi savollar chegarasi tugadi. Ertaga yana urinib ko\'ring yoki ilovadagi kalkulyatordan foydalaning.', code: 'limit', scope: lim.scope || 'ip' }, 429);
  };
  return { text, json, count, limit };
}

export async function handleAi({ request, env, ctx, origin, originOk, cors, counter, fetchImpl }) {
  const g = await gate({ request, env, ctx, origin, originOk, cors, counter, maxBody: AI_LIMITS.body });
  if (g.res) return g.res;
  const { json, count } = g;
  const parsed = parseAiBody(g.text);
  if (typeof parsed === 'string') return json({ error: parsed, code: 'bad_input' }, 400);
  const limited = await g.limit(); if (limited) return limited;
  const today = isoDay();

  const usdRate = parsed.usdRate || FALLBACK_RATE;
  const toolCtx = { usdRate, today };
  const system = [
    { type: 'text', text: buildSystem(), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: 'Bugun: ' + today + '. Foydalanuvchi tili: ' + LANG_NAME[parsed.lang] + '. Kurs: 1 USD = ' + usdRate + ' so\'m' + (parsed.usdRate ? '' : ' (taxminiy, ilova kursni yubormadi)') + '.' }
  ];
  const messages = parsed.history.map(h => ({ role: h.role, content: h.text }));
  messages.push({ role: 'user', content: parsed.q });
  /* Fikrlash tokenlari ham shu chegaradan yeydi (Sonnet 5 da u sukut
     bo'yicha yoqiq), shuning uchun javobga joy qoladigan qilib olingan.
     Chegara faqat shift — hisob haqiqatda yozilgan tokenlar bo'yicha. */
  /* "Qayerdan topaman" so'rovi: veb-qidiruv qo'shiladi (AI_WEB_SEARCH=0
     bo'lsa yo'q). Har qidiruv alohida to'lanadi, shuning uchun bitta
     so'rovda ko'pi bilan 2 ta va oddiy savollarda umuman yo'q. */
  const webOn = parsed.find && String(env.AI_WEB_SEARCH || '1') !== '0';
  const tools = webOn ? [...TOOLS, { ...WEB_SEARCH_TOOL, max_uses: Math.max(1, Math.min(3, +env.AI_WEB_SEARCH_USES || 2)) }] : TOOLS;
  const body = { model: env.AI_MODEL || DEFAULT_MODEL, max_tokens: +env.AI_MAX_TOKENS || 2048, system, tools, messages };
  if (webOn) system.push({ type: 'text', text: 'Bu "Qayerdan topaman" so\'rovi: suggest_stores dan keyin web_search bilan (ko\'pi bilan 2 ta qidiruv) indekslanadigan do\'konlarda ANIQ mahsulot sahifalarini top va product_links vositasiga ber. Taobao, Pinduoduo, Poizon uchun qidirma — ularga qidiruv havolasi yetadi.' });
  if (env.AI_EFFORT) body.output_config = { effort: env.AI_EFFORT };

  const used = []; let textOut = '', model = body.model, stop = '';
  const usage = { input: 0, output: 0, cacheRead: 0 };
  const fetchFn = fetchImpl || globalThis.fetch;
  for (let round = 0; round < AI_LIMITS.rounds; round++) {
    const r = await callClaude(body, env, fetchFn);
    if (r.error) {
      console.log('ai upstream', r.status, r.type || '', r.error);
      count('err');
      const code = r.status === 401 || r.status === 403 ? 'key' : r.status === 400 ? 'bad_request' : 'upstream';
      return json({ error: 'AI vaqtincha mavjud emas', code }, 503);
    }
    const msg = r.data || {};
    model = msg.model || model; stop = msg.stop_reason || '';
    if (msg.usage) { usage.input += msg.usage.input_tokens || 0; usage.output += msg.usage.output_tokens || 0; usage.cacheRead += msg.usage.cache_read_input_tokens || 0; }
    const content = Array.isArray(msg.content) ? msg.content : [];
    textOut = content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim() || textOut;
    /* Server vositasi (web_search) qidiruvlari — sanoq uchun. */
    const ws = msg.usage && msg.usage.server_tool_use && +msg.usage.server_tool_use.web_search_requests;
    if (ws > 0) { usage.search = (usage.search || 0) + ws; for (let i = 0; i < ws; i++) count('search'); }
    /* Uzun server-vosita navbati to'xtab qolsa (pause_turn) — davom ettiriladi. */
    if (stop === 'pause_turn') { messages.push({ role: 'assistant', content }); continue; }
    const calls = content.filter(b => b.type === 'tool_use');
    if (stop !== 'tool_use' || !calls.length) break;
    messages.push({ role: 'assistant', content });
    const results = calls.map(c => {
      const result = runTool(c.name, c.input, toolCtx);
      used.push({ name: c.name, input: c.input, result });
      count('tool:' + c.name);
      return { type: 'tool_result', tool_use_id: c.id, content: JSON.stringify(result), ...(result && result.error ? { is_error: true } : {}) };
    });
    messages.push({ role: 'user', content: results });
    if (round === AI_LIMITS.rounds - 1) stop = 'rounds';
  }
  if (stop === 'refusal') textOut = textOut || 'Bu savolga javob bera olmayman. Bojxona, kuryer yoki do\'kon haqida so\'rang.';
  /* Chegaraga urilib kesilgan javob yarim gapda tugamasin. */
  if (stop === 'max_tokens' && textOut) textOut += '\n' + 'Javob uzun bo\'lgani uchun qisqartirildi — savolni aniqroq bering.';
  if (!textOut) textOut = 'Javob tayyorlab bo\'lmadi. Savolni boshqacha yozib ko\'ring yoki ilovadagi "Jami narx" kalkulyatoridan foydalaning.';
  count('ok');
  return json({ text: textOut, tools: used, model, usage, stop });
}

/* --- Skrinshot → mahsulot ma'lumoti (POST /ai/shot). Rasm base64 (JPEG/PNG/
   WebP, ≤ ~1 MB — ilova 1280 px ga kichraytirib yuboradi). Bitta chaqiruv,
   vositasiz, qisqa ko'rsatma: model faqat rasmda ko'ringan nom, narx,
   valyuta, miqdor, do'konni JSON qilib beradi; hisob-kitob ilovada (core/).
   Model arzon (AI_SHOT_MODEL, standart Haiku 4.5). Rasm saqlanmaydi. --- */
export const SHOT_LIMITS = { body: 1500000, maxTokens: 300 };
const SHOT_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Mahsulot nomi rasmda yozilganidek (bo\'lmasa bo\'sh satr)' },
    price: { type: 'number', description: 'Joriy (chegirmali) narx raqami; topilmasa 0' },
    currency: { type: 'string', description: 'Valyuta kodi: USD, EUR, GBP, CNY, TRY, KRW, AED, RUB, UZS; noma\'lum bo\'lsa bo\'sh' },
    qty: { type: 'integer', description: 'Miqdor, ko\'rinmasa 1' },
    store: { type: 'string', description: 'Do\'kon yoki sayt nomi rasmdan; bo\'lmasa bo\'sh' },
    category: { type: 'string', description: 'Mahsulot kategoriyasi: kiyim va moda, poyabzal, elektronika, kosmetika, bolalar, universal (boshqa yoki noaniq)' },
    country: { type: 'string', description: 'Do\'kon qaysi davlatdan yuboradi — domen, til, valyuta bo\'yicha: Xitoy (.cn, ¥, xitoycha), AQSh (.com AQSh do\'koni, $), Turkiya (.tr, ₺), Angliya (.co.uk, £), Koreya (.kr, ₩), Germaniya (.de, €), BAA (.ae, AED), Rossiya (.ru, ₽); noma\'lum bo\'lsa bo\'sh' },
    weightKg: { type: 'number', description: 'Sahifada mahsulot og\'irligi ko\'rinsa, kilogrammda (800 g = 0.8); ko\'rinmasa 0' },
    confidence: { type: 'number', description: 'Narx to\'g\'ri o\'qilganiga ishonch 0..1' }
  },
  required: ['name', 'price', 'currency', 'qty', 'store', 'category', 'country', 'weightKg', 'confidence'],
  additionalProperties: false
};
const SHOT_PROMPT = 'Bu do\'kon sahifasining skrinshoti. Faqat rasmda ko\'ringan ma\'lumotni yoz: mahsulot nomi, joriy narx (chegirma bo\'lsa chegirmali narx, eski narx emas), valyuta (belgi yoki kod bo\'yicha: ¥ Xitoy saytida CNY, ₺ TRY, $ USD, € EUR, £ GBP, ₩ KRW, AED, ₽ RUB, so\'m UZS), miqdor, do\'kon nomi, mahsulot kategoriyasi (ro\'yxatdan bittasi), do\'kon qaysi davlatdan yuborishi (domen, til va valyutadan xulosa qil; aniq bo\'lmasa bo\'sh) va sahifada og\'irlik ko\'rinsa kilogrammda (ko\'rinmasa 0). Taxmin qilma: narx ko\'rinmasa price 0 va confidence 0. Javob faqat JSON.';

export function parseShotBody(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { return 'JSON kutilgan edi'; }
  if (!d || typeof d !== 'object') return 'obyekt kutilgan edi';
  let img = String(d.image || '');
  let mime = String(d.mime || '').toLowerCase();
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(img);
  if (m) { mime = m[1].toLowerCase(); img = m[2]; }
  if (!img) return 'rasm yo\'q';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) return 'rasm turi: jpeg, png yoki webp';
  if (!/^[A-Za-z0-9+/=\s]+$/.test(img.slice(0, 4000))) return 'rasm base64 emas';
  const lang = ['uz', 'uzc', 'ru'].includes(d.lang) ? d.lang : 'uz';
  const usdRate = num(d.usdRate);
  return { image: img.replace(/\s/g, ''), mime, lang, usdRate: usdRate >= 5000 && usdRate <= 50000 ? usdRate : 0 };
}

/* Modelning JSON javobini tekshirib, ilova uchun tayyor obyektga keltiradi. */
export function normalizeShot(raw, usdRate) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const price = pos(o.price);
  const cur = String(o.currency || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  const fx = KB.TARIFFS.fx || {};
  const rate = cur === 'USD' ? 1 : cur === 'UZS' ? (usdRate > 0 ? 1 / usdRate : 0) : num(fx[cur]);
  const priceUsd = price > 0 && rate > 0 ? r2(price * rate) : 0;
  return {
    found: price > 0,
    name: String(o.name || '').trim().slice(0, 80),
    price, currency: cur || (price > 0 ? 'USD' : ''),
    priceUsd, fxApprox: !!(cur && cur !== 'USD' && cur !== 'UZS' && cur !== 'EUR' && cur !== 'GBP'),
    qty: Math.max(1, Math.min(99, Math.round(pos(o.qty) || 1))),
    store: String(o.store || '').trim().slice(0, 40),
    /* Kategoriya faqat bazadagi id; davlat — kuryer tarifi bor ro'yxatdan
       (taxallus ham tushuniladi: USA → AQSh); vazn 0..50 kg. Noma'lumi
       bo'sh/0 — ilova o'zi kategoriya bo'yicha taxmin qiladi. */
    category: (() => { const c = String(o.category || '').trim().toLowerCase(); return KB.CATEGORIES.some(x => x.id === c) ? c : ''; })(),
    country: knownCountry(String(o.country || '').trim()) || '',
    weightKg: Math.min(50, Math.max(0, num(o.weightKg))),
    confidence: Math.max(0, Math.min(1, num(o.confidence)))
  };
}

export async function handleShot({ request, env, ctx, origin, originOk, cors, counter, fetchImpl }) {
  const g = await gate({ request, env, ctx, origin, originOk, cors, counter, maxBody: SHOT_LIMITS.body });
  if (g.res) return g.res;
  const { json, count } = g;
  const parsed = parseShotBody(g.text);
  if (typeof parsed === 'string') return json({ error: parsed, code: 'bad_input' }, 400);
  const limited = await g.limit(); if (limited) return limited;
  const usdRate = parsed.usdRate || FALLBACK_RATE;
  const fetchFn = fetchImpl || globalThis.fetch;
  const base = {
    model: env.AI_SHOT_MODEL || 'claude-haiku-4-5', max_tokens: SHOT_LIMITS.maxTokens,
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: parsed.mime, data: parsed.image } },
      { type: 'text', text: SHOT_PROMPT }
    ] }]
  };
  let r = await callClaude({ ...base, output_config: { format: { type: 'json_schema', schema: SHOT_SCHEMA } } }, env, fetchFn);
  /* Tuzilgan chiqish rad etilsa (eski model/proksi) — oddiy matndan JSON. */
  if (r.error && r.status === 400 && /output_config|format|schema/i.test(r.error)) r = await callClaude(base, env, fetchFn);
  if (r.error) {
    console.log('ai shot upstream', r.status, r.type || '', r.error);
    count('shot_err');
    return json({ error: 'AI vaqtincha mavjud emas', code: r.status === 401 || r.status === 403 ? 'key' : 'upstream' }, 503);
  }
  const msg = r.data || {};
  const text = (Array.isArray(msg.content) ? msg.content : []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  let raw = null;
  try { raw = JSON.parse(text); } catch (e) { const m = /\{[\s\S]*\}/.exec(text); if (m) { try { raw = JSON.parse(m[0]); } catch (e2) { raw = null; } } }
  if (msg.stop_reason === 'refusal' || !raw) { count('shot_err'); return json({ found: false, error: 'Rasmdan ma\'lumot o\'qilmadi', code: 'unreadable', model: msg.model || base.model }, 200); }
  const out = normalizeShot(raw, usdRate);
  count(out.found ? 'shot' : 'shot_empty');
  const u = msg.usage || {};
  return json({ ...out, model: msg.model || base.model, usage: { input: u.input_tokens || 0, output: u.output_tokens || 0 } });
}
