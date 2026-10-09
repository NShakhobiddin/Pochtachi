/* Pochtam Telegram boti (serverless — shu Worker ichida, webhook).
 *
 *   POST /tg — Telegram yangilanishlari. Telegram har so'rovda
 *   `X-Telegram-Bot-Api-Secret-Token` sarlavhasini yuboradi; u bot
 *   kalitidan hosil qilinadi (tgSecret) va workflow setWebhook da
 *   o'rnatadi — boshqa hech kim /tg ga yozolmaydi.
 *
 * Bot nima qiladi (faqat shaxsiy chatda):
 *   /start, /help   — qisqa yo'riqnoma va "Pochtam'ni ochish" (Mini App —
 *                      saytning o'zi Telegram ichida ochiladi);
 *   rasm/skrinshot  — narx o'qiladi (readShot, ilovadagi bilan bir xil) va
 *                      jami narx: tavsiya etilgan kuryer, boj, yig'im, so'mda;
 *   matn            — Pochtam AI javobi (runAi), do'kon havolalari tugmada;
 *   /kurs           — Markaziy bank dollar kursi.
 *
 * Javob webhook so'rovi ichida tayyorlanadi (ctx.waitUntil 30 soniya bilan
 * cheklangan, AI esa vositalar bilan undan uzoq ishlashi mumkin). Telegram
 * kechikkan yangilanishni qayta yuborsa — update_id bo'yicha bir marta
 * (Cache API, 10 daqiqa). Chegara — ilovadagi bilan bir xil
 * (AI_DAILY_PER_IP), kalit — chat id xeshi.
 * Rasm va matn saqlanmaydi.
 */
import { runAi, readShot, runTool, setGeminiPrice, plainText, AI_LIMITS } from './ai.js';
import * as KB from './kb.generated.js';

const TG_API = 'https://api.telegram.org/';
const CBU_URL = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/';
const MAX_IMAGE = 4 * 1024 * 1024;
const isoDay = (d = new Date()) => d.toISOString().slice(0, 10);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/* Webhook siri bot kalitidan: workflow ham xuddi shunday hisoblaydi,
   shuning uchun alohida sir saqlash shart emas. Telegram ruxsat bergan
   belgilar: A-Z a-z 0-9 _ -. */
export async function tgSecret(token) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pochtam-tg-webhook:' + token));
  return hex(h).slice(0, 48);
}

export const appUrl = env => String(env.TG_APP_URL || 'https://pochtam.uz/');

/* --- Matnlar (uz / ru) ------------------------------------------------- */
const T = {
  uz: {
    start: "Assalomu alaykum! Men Pochtam — chet eldan xarid yordamchisiman.\n\n" +
      "📸 Do'kon ilovasidan tovar skrinshotini yuboring — narx, kuryer, boj va jami summani hisoblayman.\n" +
      "💬 Yoki savol yozing: «Xitoydan 2 kg qancha turadi?», «Nike krossovkani qayerdan olsam bo'ladi?»\n" +
      "💱 /kurs — Markaziy bank dollar kursi.\n\nTo'liq ilova — pastdagi tugmada.",
    open: "📦 Pochtam'ni ochish", more: "Batafsil — Pochtam'da",
    reading: "Skrinshotni o'qiyapman…",
    noPrice: "Rasmdan narx o'qilmadi. Do'kon ilovasida narx va tovar nomi ko'rinadigan joyni skrinshot qilib yuboring.",
    product: "Rasmda: {0}. Narx ko'rinmadi — do'kon sahifasidagi narx ko'ringan joyni skrinshot qiling.",
    noFx: "Narx o'qildi: {0}, lekin bu valyutaning kursi topilmadi. Narxni dollarda yozing, masalan: «$120, Xitoy, 1 kg — jami qancha?»",
    noCountry: "Narx: {0}. Bu davlat uchun kuryer tarifi yo'q — ilovada hisoblab ko'ring.",
    limit: "Bugungi savollar chegarasi tugadi. Ertaga yana yozing yoki ilovadagi kalkulyatordan foydalaning.",
    down: "AI hozir javob bera olmadi. Birozdan keyin qayta urinib ko'ring.",
    big: "Rasm juda katta (4 MB gacha). Oddiy skrinshot yuboring.",
    other: "Skrinshot (rasm) yoki savol (matn) yuboring.",
    rate: "💱 Markaziy bank kursi: 1 USD = {0} so'm",
    rateNo: "Kursni hozir olib bo'lmadi.",
    goods: "🛍 Tovar", courier: "🚚 Kuryer", rec: "tavsiya", cheaper: "arzonroq", duty: "🛃 Boj", fee: "yig'im", free: "me'yor ichida — boj yo'q",
    total: "💰 Jami", kg: "kg", kgGuess: "taxminiy vazn", note: "Taxminiy hisob: shu oyda boshqa jo'natma bo'lmasa (bojsiz me'yor $200/oy). Yakuniy summani bojxona va kuryer belgilaydi."
  },
  ru: {
    start: "Здравствуйте! Я Pochtam — помощник по покупкам за рубежом.\n\n" +
      "📸 Пришлите скриншот товара из приложения магазина — посчитаю цену, курьера, пошлину и итог.\n" +
      "💬 Или задайте вопрос: «Сколько стоит доставка 2 кг из Китая?»\n" +
      "💱 /kurs — курс доллара ЦБ.\n\nПолное приложение — по кнопке ниже.",
    open: "📦 Открыть Pochtam", more: "Подробнее — в Pochtam",
    reading: "Читаю скриншот…",
    noPrice: "Цена на изображении не найдена. Сделайте скриншот, где видны цена и название товара.",
    product: "На фото: {0}. Цены не видно — сделайте скриншот страницы товара с ценой.",
    noFx: "Цена считана: {0}, но курс этой валюты не найден. Напишите цену в долларах: «$120, Китай, 1 кг — сколько итого?»",
    noCountry: "Цена: {0}. Для этой страны нет тарифов курьеров — посчитайте в приложении.",
    limit: "Лимит вопросов на сегодня исчерпан. Напишите завтра или воспользуйтесь калькулятором в приложении.",
    down: "AI сейчас не ответил. Попробуйте чуть позже.",
    big: "Изображение слишком большое (до 4 МБ). Пришлите обычный скриншот.",
    other: "Пришлите скриншот (фото) или вопрос (текст).",
    rate: "💱 Курс ЦБ: 1 USD = {0} сум",
    rateNo: "Не удалось получить курс.",
    goods: "🛍 Товар", courier: "🚚 Курьер", rec: "рекомендуем", cheaper: "дешевле", duty: "🛃 Пошлина", fee: "сбор", free: "в пределах лимита — без пошлины",
    total: "💰 Итого", kg: "кг", kgGuess: "примерный вес", note: "Примерный расчёт: если в этом месяце не было других посылок (лимит $200/мес). Итоговую сумму определяют таможня и курьер."
  }
};
const fill = (s, ...a) => String(s).replace(/\{(\d)\}/g, (m, i) => a[+i] == null ? '' : String(a[+i]));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const usd = n => '$' + (Math.round(n * 100) / 100).toFixed(2);

/* --- Telegram API ------------------------------------------------------ */
async function tg(env, method, payload, fetchFn) {
  try {
    const r = await fetchFn(TG_API + 'bot' + env.TELEGRAM_BOT_TOKEN + '/' + method, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => null);
    if (!j || !j.ok) console.log('tg', method, r.status, j && j.description);
    return j && j.ok ? j.result : null;
  } catch (e) { console.log('tg', method, 'tarmoq', e && e.message); return null; }
}
const appButton = (env, text) => ({ inline_keyboard: [[{ text, web_app: { url: appUrl(env) } }]] });

/* --- Kurs (Markaziy bank, 6 soat keshda) ------------------------------- */
export function fxFromCbu(rows) {
  const out = {};
  for (const r of Array.isArray(rows) ? rows : []) {
    const rate = parseFloat(String(r && r.Rate || '').replace(',', '.')), nom = parseFloat(r && r.Nominal) || 1;
    if (r && r.Ccy && rate > 0) out[String(r.Ccy).toUpperCase()] = rate / nom;
  }
  return out;
}
async function cbuRates(fetchFn) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = 'https://pochtam.internal/cbu';
  try { if (cache) { const hit = await cache.match(key); if (hit) return await hit.json(); } } catch (e) {}
  try {
    const r = await fetchFn(CBU_URL, { headers: { accept: 'application/json' } });
    const fx = fxFromCbu(await r.json());
    if (fx.USD > 0 && cache) await cache.put(key, new Response(JSON.stringify(fx), { headers: { 'cache-control': 'max-age=21600', 'content-type': 'application/json' } }));
    return fx.USD > 0 ? fx : {};
  } catch (e) { return {}; }
}

/* --- Skrinshot → jami narx -------------------------------------------- */
const BY_CUR = { CNY: 'Xitoy', TRY: 'Turkiya', KRW: 'Koreya', AED: 'BAA', GBP: 'Angliya', EUR: 'Germaniya', USD: 'AQSh', RUB: 'Rossiya' };
const normName = s => String(s || '').toLowerCase().replace(/[^a-z0-9Ѐ-ӿ]+/g, '');

/* Davlat — ilovadagi shotToLc bilan bir xil qoida: ma'lum do'kon bo'lsa
   uning yuboradigan davlatlari ichidan valyuta, keyin AI aytgan davlat. */
export function shotCountry(shot) {
  const n = normName(shot.store);
  const store = n ? KB.STORES.find(s => normName(s.name) === n || (s.domain && n.includes(normName(String(s.domain).split('.')[0])))) : null;
  const cur = String(shot.currency || '').toUpperCase();
  if (store) {
    const from = Array.isArray(store.from) && store.from.length ? store.from : [store.country];
    return from.includes(BY_CUR[cur]) ? BY_CUR[cur] : from.includes(shot.country) ? shot.country : store.country;
  }
  return shot.country || BY_CUR[cur] || '';
}

/* Natija matni (HTML). lc — landed_cost vositasi natijasi. */
export function shotReply(shot, lc, lang, priceUsd) {
  const L = T[lang] || T.uz;
  const name = shot.name || (lang === 'ru' ? 'Товар' : 'Tovar');
  const cur = String(shot.currency || 'USD').toUpperCase();
  const priceTxt = shot.price + ' ' + cur + (cur !== 'USD' ? ' ≈ ' + usd(priceUsd) : '');
  const lines = [`<b>${esc(name)}</b>`, `${L.goods}: ${esc(priceTxt)}${shot.qty > 1 && !shot.multi ? ' × ' + shot.qty : ''}${shot.store ? ' · ' + esc(shot.store) : ''}`];
  if (lc.courier) {
    const kgTxt = String(lc.billableKg).replace('.', ',') + ' ' + L.kg + (lc.kgGuessed ? ' (' + L.kgGuess + ')' : '');
    lines.push(`${L.courier}: ${esc(lc.courier.name)}${lc.courier.recommended ? ' (' + L.rec + ')' : ''} — ${usd(lc.shipUsd)} · ${kgTxt}${lc.courier.days ? ' · ' + esc(lc.courier.days) : ''}`);
    if (lc.cheapestCourier) lines.push(`   ${L.cheaper}: ${esc(lc.cheapestCourier.name)} — ${usd(lc.cheapestCourier.usd)}`);
  }
  lines.push(lc.dutyUsd > 0 || lc.feeUzs > 0
    ? `${L.duty}: ${usd(lc.dutyUsd)} · ${L.fee}: ${money(lc.feeUzs)} ${lang === 'ru' ? 'сум' : "so'm"}`
    : `${L.duty}: ${L.free}`);
  lines.push(`<b>${L.total}: ${usd(lc.totalUsd)} ≈ ${money(lc.totalUzs)} ${lang === 'ru' ? 'сум' : "so'm"}</b>`);
  lines.push('', `<i>${esc(L.note)}</i>`);
  return lines.join('\n');
}

async function photoFileId(msg) {
  if (Array.isArray(msg.photo) && msg.photo.length) {
    const ok = msg.photo.filter(p => !p.file_size || p.file_size <= MAX_IMAGE);
    const best = (ok.length ? ok : msg.photo).slice().sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
    return { id: best.file_id, mime: 'image/jpeg', size: best.file_size || 0 };
  }
  const d = msg.document;
  if (d && /^image\/(jpeg|png|webp)$/.test(d.mime_type || '')) return { id: d.file_id, mime: d.mime_type, size: d.file_size || 0 };
  return null;
}
function toBase64(buf) {
  const bytes = new Uint8Array(buf); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/* --- Chegara va sanoq (ilovadagi gate bilan bir xil hisobga) ------------ */
function counterOps(env, counter, ctx) {
  const add = rows => { if (counter) { const p = counter.fetch('https://counter/add', { method: 'POST', body: JSON.stringify(rows) }).catch(() => {}); if (ctx && ctx.waitUntil) ctx.waitUntil(p); } };
  const count = key => add([{ day: isoDay(), name: 'ai', key, n: 1 }]);
  const spend = (kind, u) => {
    if (!u) return; const day = isoDay(), rows = [];
    if (u.usd > 0) rows.push({ day, name: 'ai_usd', key: kind, n: Math.round(u.usd * 1e6) });
    for (const [k, v] of [['input', u.input], ['output', u.output]]) if (v > 0) rows.push({ day, name: 'ai_tok', key: k, n: v });
    if (rows.length) add(rows);
  };
  const limit = async chatId => {
    if (!counter) return true;
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tg|' + chatId + '|' + isoDay() + '|' + (env.READ_TOKEN || env.TELEGRAM_BOT_TOKEN || '')));
    const key = 'tg' + hex(h).slice(0, 14);
    try {
      const lim = await (await counter.fetch('https://counter/limit', { method: 'POST', body: JSON.stringify({ key, max: +env.AI_DAILY_PER_IP || 20, total: +env.AI_DAILY_TOTAL || 300, budget: Math.round((+env.AI_DAILY_USD || 0) * 1e6), find: false, maxFind: 0, eval: false }) })).json();
      return lim.ok !== false;
    } catch (e) { return true; }
  };
  return { count, spend, limit };
}

/* --- Bitta yangilanish ------------------------------------------------- */
export async function processUpdate(update, env, { counter, ctx, fetchFn = globalThis.fetch } = {}) {
  const msg = update && (update.message || update.edited_message);
  if (!msg || !msg.chat || msg.chat.type !== 'private') return { skip: 'chat' };
  const chatId = msg.chat.id;
  const lang = /^ru/i.test((msg.from && msg.from.language_code) || '') ? 'ru' : 'uz';
  const L = T[lang];
  const send = (text, extra = {}) => tg(env, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...extra }, fetchFn);
  const ops = counterOps(env, counter, ctx);
  setGeminiPrice(env.AI_GEMINI_PRICE);
  const text = String(msg.text || msg.caption || '').trim();

  if (/^\/(start|help|yordam)\b/i.test(text)) { ops.count('tg_start'); await send(esc(L.start), { reply_markup: appButton(env, L.open) }); return { done: 'start' }; }
  if (/^\/(kurs|rate)\b/i.test(text)) {
    const fx = await cbuRates(fetchFn);
    await send(fx.USD > 0 ? fill(L.rate, money(fx.USD)) : L.rateNo);
    return { done: 'kurs' };
  }

  const file = await photoFileId(msg);
  if (!file && !text) { await send(L.other); return { done: 'other' }; }
  if (!env.ANTHROPIC_API_KEY && !env.GEMINI_API_KEY) { await send(L.down, { reply_markup: appButton(env, L.open) }); return { done: 'no_key' }; }
  if (!(await ops.limit(chatId))) { ops.count('tg_limit'); await send(L.limit, { reply_markup: appButton(env, L.open) }); return { done: 'limit' }; }
  await tg(env, 'sendChatAction', { chat_id: chatId, action: file ? 'upload_photo' : 'typing' }, fetchFn);
  const fx = await cbuRates(fetchFn);
  const usdRate = fx.USD > 0 ? fx.USD : 0;

  /* Rasm — skrinshot. */
  if (file) {
    if (file.size > MAX_IMAGE) { await send(L.big); return { done: 'big' }; }
    const f = await tg(env, 'getFile', { file_id: file.id }, fetchFn);
    if (!f || !f.file_path) { await send(L.down); return { done: 'file' }; }
    let image;
    try {
      const r = await fetchFn(TG_API + 'file/bot' + env.TELEGRAM_BOT_TOKEN + '/' + f.file_path);
      const buf = await r.arrayBuffer();
      if (buf.byteLength > MAX_IMAGE) { await send(L.big); return { done: 'big' }; }
      image = toBase64(buf);
    } catch (e) { await send(L.down); return { done: 'download' }; }
    const mime = /\.png$/i.test(f.file_path) ? 'image/png' : /\.webp$/i.test(f.file_path) ? 'image/webp' : file.mime;
    const rs = await readShot({ image, mime, usdRate: usdRate || 12700, env, fetchFn });
    if (rs.err) { ops.count('tg_shot_err'); await send(L.down); return { done: 'shot_err' }; }
    ops.spend('tg_shot', rs.usage);
    const shot = rs.unreadable ? { found: false } : rs.out;
    if (!shot.found || !(shot.price > 0)) {
      ops.count('tg_shot_empty');
      await send(shot.kind === 'product' && shot.name ? fill(L.product, esc(shot.name)) : L.noPrice, { reply_markup: appButton(env, L.open) });
      return { done: 'shot_empty' };
    }
    /* Dollar: Markaziy bank kursi bo'lsa — o'sha (ilovadagi kabi), bo'lmasa
       zaxira jadvalidan (readShot), u ham bo'lmasa — narx so'raladi. */
    const cur = String(shot.currency || 'USD').toUpperCase();
    const priceUsd = cur === 'USD' ? shot.price : fx[cur] > 0 && usdRate > 0 ? shot.price * fx[cur] / usdRate : shot.priceUsd;
    if (!(priceUsd > 0)) { await send(fill(L.noFx, esc(shot.price + ' ' + cur))); return { done: 'no_fx' }; }
    const country = shotCountry(shot);
    const lc = runTool('landed_cost', { priceUsd, qty: shot.multi ? 1 : shot.qty, country, category: shot.category, kg: shot.weightKg > 0 ? shot.weightKg : 0 },
      { usdRate: usdRate || 12700, today: isoDay() });
    if (lc.error) { await send(fill(L.noCountry, esc(shot.price + ' ' + cur)), { reply_markup: appButton(env, L.open) }); return { done: 'no_country' }; }
    ops.count('tg_shot');
    await send(shotReply(shot, lc, lang, priceUsd), { reply_markup: appButton(env, L.more) });
    return { done: 'shot', country, total: lc.totalUsd };
  }

  /* Matn — Pochtam AI. */
  const q = text.slice(0, AI_LIMITS.q);
  const parsed = { q, shot: null, kw: false, who: '', style: '', cart: null, lang, history: [], usdRate, find: false, stream: false };
  let out;
  try { out = await runAi({ parsed, env, count: k => ops.count('tg_' + k), fetchImpl: fetchFn, emit: null }); }
  catch (e) { console.log('tg ai', e && e.message); out = { status: 503, body: {} }; }
  if (out.status !== 200 || !out.body || !out.body.text) { await send(L.down); return { done: 'ai_err' }; }
  ops.spend('tg_chat', out.body.usage);
  ops.count('tg_chat');
  /* Do'kon va mahsulot havolalari — tugmalar (3 tagacha) + Mini App. */
  const rows = [];
  for (const c of out.body.cards || []) {
    if (c.type === 'stores') for (const s of (c.stores || []).slice(0, 3)) if (/^https:\/\//.test(s.searchUrl || '')) rows.push([{ text: s.name, url: s.searchUrl }]);
    if (c.type === 'links') for (const l of (c.links || []).slice(0, 3)) if (/^https:\/\//.test(l.url || '')) rows.push([{ text: String(l.title || l.host).slice(0, 40), url: l.url }]);
  }
  rows.splice(3);
  rows.push([{ text: L.open, web_app: { url: appUrl(env) } }]);
  const body = esc(plainText(out.body.text)).slice(0, 3900);
  await send(body, { reply_markup: { inline_keyboard: rows } });
  return { done: 'chat' };
}

/* POST /tg — webhook. */
export async function handleTelegram({ request, env, ctx, counter, fetchImpl }) {
  if (!env.TELEGRAM_BOT_TOKEN) return new Response('not found', { status: 404 });
  const got = request.headers.get('x-telegram-bot-api-secret-token') || '';
  const want = await tgSecret(env.TELEGRAM_BOT_TOKEN);
  if (got.length !== want.length || got !== want) return new Response('forbidden', { status: 403 });
  let update;
  try { update = JSON.parse((await request.text()).slice(0, 200000)); } catch (e) { return new Response('ok'); }
  if (update && Number.isFinite(update.update_id) && typeof caches !== 'undefined') {
    const key = 'https://pochtam.internal/tg-update/' + update.update_id;
    try {
      if (await caches.default.match(key)) return new Response('ok');
      await caches.default.put(key, new Response('1', { headers: { 'cache-control': 'max-age=600' } }));
    } catch (e) {}
  }
  try { await processUpdate(update, env, { counter, ctx, fetchFn: fetchImpl || globalThis.fetch }); }
  catch (e) { console.log('tg', e && e.message || e); }
  return new Response('ok');
}
