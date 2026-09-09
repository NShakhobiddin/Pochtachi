/* Pochtam o'lchov serveri — Cloudflare Worker + Durable Object (SQLite).
 *
 * Ilova (index.html, `metrics`) sahifa fonga o'tganda bitta beacon yuboradi:
 *   POST /   { "v": "v1.0.0 · 19.08.2026", "l": "uz",
 *              "e": [ { "n": "screen", "k": "stores", "t": 1788521904608 }, … ] }
 * Bu yerda faqat SANOQ saqlanadi: kun · hodisa nomi · kalit → nechta.
 * IP, foydalanuvchi identifikatori, xom hodisa, vaqt tamg'asi yozilmaydi.
 *
 * Nega Durable Object: KV bepul tarifida kuniga 1 000 yozuv — bir kunlik
 * trafikka yetmaydi, ustiga parallel yozuvlar bir-birini yo'qotadi. Bitta
 * SQLite-li obyekt hamma sanoqni atomar UPSERT bilan yuritadi, bepul tarifda
 * ishlaydi va o'qish uchun tayyor JSON beradi.
 *
 * Yo'llar:
 *   OPTIONS *          — CORS preflight
 *   POST /             — beacon (faqat ALLOW_ORIGIN dan; vergul bilan bir nechta)
 *   GET  /stats?days=7 — jamlangan sanoq, `Authorization: Bearer <READ_TOKEN>`
 *                        yoki `?token=` bilan
 *   GET  /public       — PUBLIC_STATS="1" bo'lsa: oxirgi 7 kunning eng ko'p
 *                        ochilgan do'kon/kuryer/qo'llanmalari, tokensiz,
 *                        1 soat keshlanadi (ilovadagi "tirik signal" uchun)
 *   GET  /hisobot      — o'qiladigan hisobot sahifasi (parol sahifada so'raladi)
 *   GET  /             — "ok"
 */

import { hisobotHtml } from './hisobot.js';

const NAMES = new Set(['screen', 'store', 'courier', 'guide', 'wizard', 'svcAsk', 'hamkor']);
const MAX_EVENTS = 60, MAX_BODY = 8192, MAX_KEY = 40, MAX_DAYS = 90;

/* Beacon matnini tekshirib, (kun, nom, kalit) uchliklariga sanoq beradi.
   Noto'g'ri yoki begona hodisalar tashlab yuboriladi — xato qaytarilmaydi,
   chunki beacon javobni o'qimaydi. Kun serverning UTC kuni: mijoz vaqti
   soxta bo'lishi mumkin. Til va versiya ham sanaladi (lang:uz, ver:…). */
export function parseBeacon(text, today) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return []; }
  if (!data || typeof data !== 'object' || !Array.isArray(data.e)) return [];
  const counts = new Map();
  const SEP = '\u0001';
  const clean = (v, max) => String(v == null ? '' : v).slice(0, max).replace(/[\u0000-\u001f]/g, '').trim();
  const add = (n, k) => { const id = today + SEP + n + SEP + k; counts.set(id, (counts.get(id) || 0) + 1); };
  let took = 0;
  for (const ev of data.e) {
    if (took >= MAX_EVENTS) break;
    if (!ev || typeof ev !== 'object' || !NAMES.has(ev.n)) continue;
    const k = clean(ev.k, MAX_KEY) || '-';
    add(ev.n, k); took++;
  }
  if (took) {
    const l = clean(data.l, 8).replace(/[^a-zA-Z-]/g, '') || '-';
    add('lang', l);
    const v = clean(data.v, 40) || '-';
    add('ver', v);
  }
  return [...counts].map(([id, n]) => { const [day, name, key] = id.split(SEP); return { day, name, key, n }; });
}

const isoDay = (d = new Date()) => d.toISOString().slice(0, 10);
const daysBack = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return isoDay(d); };

/* ALLOW_ORIGIN — bitta yoki vergul bilan bir nechta manzil (GitHub Pages va
   o'z domen birga yashaganda). Javobda so'rov kelgan manzil qaytariladi,
   ro'yxatda bo'lmasa — birinchisi. */
const origins = env => String(env.ALLOW_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const originOk = (env, origin) => { const l = origins(env); return !l.length || l.includes(origin); };
function cors(env, extra = {}, origin = '') {
  const l = origins(env);
  return {
    'Access-Control-Allow-Origin': !l.length ? '*' : (l.includes(origin) ? origin : l[0]),
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    ...extra
  };
}
const json = (env, obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: cors(env, { 'content-type': 'application/json; charset=utf-8', ...extra }) });

/* Bitta obyekt hamma sanoqni yuritadi (id: "main"). */
export class Counter {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS counts (
      day TEXT NOT NULL, name TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, name, key))`);
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/add') {
      const rows = await request.json();
      for (const r of rows) {
        this.sql.exec(`INSERT INTO counts (day, name, key, n) VALUES (?, ?, ?, ?)
          ON CONFLICT(day, name, key) DO UPDATE SET n = n + excluded.n`, r.day, r.name, r.key, r.n);
      }
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/stats') {
      const days = Math.min(MAX_DAYS, Math.max(1, +url.searchParams.get('days') || 7));
      const from = daysBack(days - 1);
      const cur = this.sql.exec(`SELECT day, name, key, n FROM counts WHERE day >= ? ORDER BY day, name, n DESC`, from);
      const byName = {}, byDay = {};
      for (const r of cur) {
        (byName[r.name] ||= {})[r.key] = ((byName[r.name] || {})[r.key] || 0) + r.n;
        if (r.name === 'screen') byDay[r.day] = (byDay[r.day] || 0) + r.n;
      }
      /* Har nom ichida kalitlar kamayish tartibida. */
      for (const name of Object.keys(byName)) {
        byName[name] = Object.fromEntries(Object.entries(byName[name]).sort((a, b) => b[1] - a[1]));
      }
      return json(this.env, { from, to: isoDay(), days, byDay, byName });
    }
    if (request.method === 'DELETE' && url.pathname === '/purge') {
      /* Saqlash muddati: MAX_DAYS dan eski qatorlar o'chiriladi. */
      this.sql.exec(`DELETE FROM counts WHERE day < ?`, daysBack(MAX_DAYS));
      return new Response(null, { status: 204 });
    }
    return new Response('not found', { status: 404 });
  }
}

function authorized(request, url, env) {
  if (!env.READ_TOKEN) return false;
  const h = request.headers.get('authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : (url.searchParams.get('token') || '');
  return t.length > 0 && t === env.READ_TOKEN;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, {}, origin) });
    const counter = env.COUNTER.get(env.COUNTER.idFromName('main'));

    if (request.method === 'POST' && url.pathname === '/') {
      /* Faqat o'z saytimizdan: aks holda boshqa saytlar sanoqni shishiradi.
         sendBeacon ham, fetch(no-cors) ham Origin sarlavhasini yuboradi. */
      if (!originOk(env, origin)) return new Response(null, { status: 403, headers: cors(env, {}, origin) });
      const len = +(request.headers.get('content-length') || 0);
      if (len > MAX_BODY) return new Response(null, { status: 413, headers: cors(env, {}, origin) });
      let text = await request.text();
      if (text.length > MAX_BODY) text = text.slice(0, MAX_BODY);
      const rows = parseBeacon(text, isoDay());
      if (rows.length) {
        ctx.waitUntil(counter.fetch('https://counter/add', { method: 'POST', body: JSON.stringify(rows) }));
      }
      return new Response(null, { status: 204, headers: cors(env, {}, origin) });
    }

    if (request.method === 'GET' && url.pathname === '/stats') {
      if (!authorized(request, url, env)) return json(env, { error: 'token kerak' }, 401);
      const res = await counter.fetch('https://counter/stats?days=' + encodeURIComponent(url.searchParams.get('days') || '7'));
      return new Response(res.body, { status: res.status, headers: cors(env, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }) });
    }

    if (request.method === 'GET' && url.pathname === '/public') {
      if (env.PUBLIC_STATS !== '1') return json(env, { error: 'yopiq' }, 404);
      const cache = caches.default;
      const cached = await cache.match(request);
      if (cached) return cached;
      const res = await counter.fetch('https://counter/stats?days=7');
      const st = await res.json();
      const top = (name, n = 5) => Object.entries(st.byName[name] || {}).slice(0, n).map(([k, v]) => ({ k, n: v }));
      const out = json(env, { from: st.from, to: st.to, stores: top('store'), couriers: top('courier'), guides: top('guide'),
        calcWeek: Object.values(st.byDay).reduce((a, b) => a + b, 0) }, 200, { 'cache-control': 'public, max-age=3600' });
      ctx.waitUntil(cache.put(request, out.clone()));
      return out;
    }

    if (request.method === 'DELETE' && url.pathname === '/purge') {
      if (!authorized(request, url, env)) return json(env, { error: 'token kerak' }, 401);
      await counter.fetch('https://counter/purge', { method: 'DELETE' });
      return new Response(null, { status: 204, headers: cors(env) });
    }

    if (request.method === 'GET' && (url.pathname === '/hisobot' || url.pathname === '/hisobot/')) {
      /* Sahifaning o'zi ochiq (unda ma'lumot yo'q); sanoqni u /stats dan
         token bilan oladi. */
      return new Response(hisobotHtml(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
    }
    if (request.method === 'GET' && url.pathname === '/') return new Response('ok', { headers: cors(env) });
    return new Response('not found', { status: 404, headers: cors(env) });
  },

  /* Har kuni eski sanoqni tozalash (wrangler.toml dagi cron). */
  async scheduled(event, env) {
    const counter = env.COUNTER.get(env.COUNTER.idFromName('main'));
    await counter.fetch('https://counter/purge', { method: 'DELETE' });
  }
};
