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
const DEFAULT_MODEL = 'claude-opus-5';
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
export function buildSystem() {
  const cur = Core.normsAt(KB.NORMS, isoDay()) || {};
  const couriers = KB.COURIERS.map(c => ({ name: c.name, countries: c.countries, days: c.days, mode: c.mode, tracking: c.tracking, note: c.note, limits: c.limits }));
  const stores = KB.STORES.map(s => ({ name: s.name, domain: s.domain, country: s.country, cat: s.cat, type: s.type, price: s.price, original: s.original, direct: s.direct, complexity: s.complexity, returns: s.returns }));
  const banned = KB.BANNED.map(b => ({ name: b.name, level: LEVEL[b.level] || b.level, src: b.src }));
  return [
    KB.RULES.trim(),
    '## Joriy me\'yor (NORMS)\n' + JSON.stringify(cur),
    '## Kuryerlar (' + couriers.length + ')\n' + JSON.stringify(couriers),
    '## Kuryer tarifi bor davlatlar\n' + KB.COUNTRIES.join(', '),
    '## Do\'konlar (' + stores.length + ')\n' + JSON.stringify(stores),
    '## Taqiqlangan va cheklangan tovarlar\n' + JSON.stringify(banned),
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
  }
];

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

function quotesFor(country, kg, priority) {
  const all = Core.courierQuotes({ couriers: KB.COURIERS, tariffs: KB.TARIFFS, country, kg, usdRate: 0, minKg: 0.5 });
  const ranked = Core.rankQuotes(all, priority || 'cheap');
  return { ok: ranked.filter(q => q.ok), rest: ranked.filter(q => !q.ok) };
}

function toolQuotes(inp) {
  const country = String(inp.country || '').trim(), kg = pos(inp.kg);
  if (!country || !(kg > 0)) return { error: 'davlat va og\'irlik kerak' };
  const known = knownCountry(country);
  if (!known) return { error: 'bu davlat uchun tarif yo\'q', countries: KB.COUNTRIES };
  const { ok, rest } = quotesFor(known, kg, inp.priority);
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
  const { ok } = quotesFor(known, billKg, 'cheap');
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
    if (name === 'courier_quotes') return toolQuotes(inp);
    if (name === 'landed_cost') return toolLanded(inp, ctx);
    if (name === 'check_banned') return toolBanned(inp);
    if (name === 'find_store') return toolStore(inp);
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
  return { q, lang, history: hist, usdRate: usdRate >= 5000 && usdRate <= 50000 ? usdRate : 0 };
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

export async function handleAi({ request, env, ctx, origin, originOk, cors, counter, fetchImpl }) {
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: cors(env, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, origin) });
  const count = key => { if (counter && ctx) ctx.waitUntil(counter.fetch('https://counter/add', { method: 'POST', body: JSON.stringify([{ day: isoDay(), name: 'ai', key, n: 1 }]) }).catch(() => {})); };
  if (!originOk) return json({ error: 'ruxsat yo\'q' }, 403);
  if (!env.ANTHROPIC_API_KEY) { count('no_key'); return json({ error: 'AI vaqtincha mavjud emas', code: 'no_key' }, 503); }
  const len = +(request.headers.get('content-length') || 0);
  if (len > AI_LIMITS.body) return json({ error: 'so\'rov juda katta', code: 'bad_input' }, 413);
  const text = await request.text();
  if (text.length > AI_LIMITS.body) return json({ error: 'so\'rov juda katta', code: 'bad_input' }, 413);
  const parsed = parseAiBody(text);
  if (typeof parsed === 'string') return json({ error: parsed, code: 'bad_input' }, 400);

  const today = isoDay();
  /* Kunlik chegara: IP xeshi (kun + sir bilan tuzlangan, qayta tiklanmaydi) va umumiy. */
  if (counter) {
    const key = await ipKey(request, env, today);
    const perIp = +env.AI_DAILY_PER_IP || 20, total = +env.AI_DAILY_TOTAL || 300;
    let lim = { ok: true };
    try { lim = await (await counter.fetch('https://counter/limit', { method: 'POST', body: JSON.stringify({ key, max: perIp, total }) })).json(); } catch (e) { lim = { ok: true }; }
    if (!lim.ok) { count('limit'); return json({ error: 'Bugungi savollar chegarasi tugadi. Ertaga yana urinib ko\'ring yoki ilovadagi kalkulyatordan foydalaning.', code: 'limit', scope: lim.scope || 'ip' }, 429); }
  }

  const usdRate = parsed.usdRate || FALLBACK_RATE;
  const toolCtx = { usdRate, today };
  const system = [
    { type: 'text', text: buildSystem(), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: 'Bugun: ' + today + '. Foydalanuvchi tili: ' + LANG_NAME[parsed.lang] + '. Kurs: 1 USD = ' + usdRate + ' so\'m' + (parsed.usdRate ? '' : ' (taxminiy, ilova kursni yubormadi)') + '.' }
  ];
  const messages = parsed.history.map(h => ({ role: h.role, content: h.text }));
  messages.push({ role: 'user', content: parsed.q });
  const body = { model: env.AI_MODEL || DEFAULT_MODEL, max_tokens: +env.AI_MAX_TOKENS || 1024, system, tools: TOOLS, messages };
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
  if (!textOut) textOut = 'Javob tayyorlab bo\'lmadi. Savolni boshqacha yozib ko\'ring yoki ilovadagi "Jami narx" kalkulyatoridan foydalaning.';
  count('ok');
  return json({ text: textOut, tools: used, model, usage, stop });
}
