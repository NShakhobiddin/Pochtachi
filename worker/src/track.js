/* Hamkor kuryer holat API (soddalashtirishning 5-bosqichi).
 *
 * Hamkor kuryer o'z tizimidan jo'natma holatini yuboradi, ilova esa xarid
 * kartasida shu holatni ko'rsatadi — foydalanuvchi "Yo'lga chiqdi",
 * "Bojxonaga keldi" tugmalarini o'zi bosib o'tirmaydi.
 *
 *   POST /partner/status   — kuryer yozadi. `Authorization: Bearer <kalit>`;
 *                            kalit qaysi kuryerniki ekanini o'zi aytadi
 *                            (PARTNER_KEYS siri: "d2d:kalit1,globbing:kalit2").
 *                            READ_TOKEN egasi (loyiha egasi) istalgan kuryer
 *                            nomidan yoza oladi — body'da `courier` bilan;
 *                            "sinov" kuryeri faqat shu yo'l bilan (workflow).
 *   POST /track            — ilova o'qiydi: { q: [{ c, n }, …] } → { r: […] },
 *                            faqat ALLOW_ORIGIN dan, bir so'rovda 20 tagacha.
 *
 * Maxfiylik: jo'natma raqami ochiq saqlanmaydi — kalit SHA-256(kuryer + raqam).
 * Baza to'kilsa ham raqamlar ro'yxatini tiklab bo'lmaydi; holatni faqat
 * raqamni biladigan odam so'ray oladi. Izoh 120 belgigacha, ism-familiya
 * yozmaslik hamkor hujjatida talab qilingan. 90 kun yangilanmagan yozuv
 * kunlik cron'da o'chadi.
 */

export const STATUSES = ['received', 'shipped', 'customs', 'held', 'ready', 'delivered'];
const MAX_EVENTS = 200, MAX_QUERY = 20, MAX_HISTORY = 12, MAX_NOTE = 120, KEEP_DAYS = 90, MAX_BODY = 65536;
/* Durable Object ombori bitta get/put/delete da ko'pi bilan 128 kalit
   qabul qiladi — ko'prog'i xato beradi, shuning uchun bo'laklab. */
const DO_BATCH = 128;
const chunks = (a, n = DO_BATCH) => { const out = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, n + i)); return out; };
export const TEST_COURIER = 'sinov';

/* PARTNER_KEYS: "id:kalit" juftlari vergul bilan. 24 belgidan qisqa kalit
   hisobga olinmaydi — tasodifan qisqa parol qo'yilmasin. */
export function partnerKeys(env) {
  const out = new Map();
  for (const part of String(env.PARTNER_KEYS || '').split(',')) {
    const i = part.indexOf(':');
    if (i < 1) continue;
    const id = part.slice(0, i).trim().toLowerCase(), key = part.slice(i + 1).trim();
    if (/^[a-z0-9_-]{2,32}$/.test(id) && key.length >= 24) out.set(key, id);
  }
  return out;
}
export const partnerIds = env => [...new Set(partnerKeys(env).values())].filter(id => id !== TEST_COURIER).sort();

/* Uzunligi teng satrlar uchun vaqtga bog'liq bo'lmagan taqqoslash
   (index.js dagi READ_TOKEN tekshiruvi ham shuni ishlatadi). */
export function same(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
/* Kalit → kuryer id. READ_TOKEN — egasi: { owner: true }. */
export function whoIs(env, auth) {
  const t = String(auth || '').startsWith('Bearer ') ? String(auth).slice(7).trim() : '';
  if (!t) return null;
  if (env.READ_TOKEN && same(t, String(env.READ_TOKEN))) return { owner: true };
  for (const [key, id] of partnerKeys(env)) if (same(t, key)) return { id };
  return null;
}

export const normNumber = n => String(n == null ? '' : n).replace(/\s+/g, '').toUpperCase();
export const numberOk = n => /^[A-Z0-9-]{6,40}$/.test(n);
const cleanNote = s => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE);

export async function trackKey(courier, number) {
  const data = new TextEncoder().encode(courier + '\n' + number);
  const h = await crypto.subtle.digest('SHA-256', data);
  return 't:' + [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Bitta hodisani tekshiradi: { number, status, at?, note? }. Vaqt kelajakda
   bir kundan, o'tmishda 90 kundan uzoq bo'lsa — hozirgi vaqt. */
export function parseEvent(ev, now = Date.now()) {
  if (!ev || typeof ev !== 'object') return { error: 'obyekt emas' };
  const n = normNumber(ev.number);
  if (!numberOk(n)) return { error: 'number: 6–40 belgi, lotin harf, raqam, chiziqcha' };
  const st = String(ev.status || '').toLowerCase();
  if (!STATUSES.includes(st)) return { error: 'status: ' + STATUSES.join('|') };
  let at = Date.parse(ev.at || '');
  if (!Number.isFinite(at) || at > now + 86400000 || at < now - KEEP_DAYS * 86400000) at = now;
  return { n, st, at, note: cleanNote(ev.note) };
}

/* Durable Object: kalit-qiymat ombori (SQLite asosida). Yozuv:
   { st, at, note, h: [{ st, at, note }] (yangisi oldinda), u: yozilgan vaqt } */
export class Tracks {
  constructor(state) { this.storage = state.storage; }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/put') {
      const { items } = await request.json();
      const now = Date.now();
      const keys = [...new Set(items.map(x => x.k))];
      const cur = new Map();
      for (const part of chunks(keys)) for (const [k, v] of await this.storage.get(part)) cur.set(k, v);
      const next = new Map();
      for (const it of items) {
        const rec = next.get(it.k) || cur.get(it.k) || { st: '', at: 0, note: '', h: [] };
        /* Bir xil hodisa qayta kelsa (kuryer qayta yuborsa) — takrorlanmaydi. */
        if (!rec.h.some(e => e.st === it.st && e.at === it.at)) {
          rec.h = [{ st: it.st, at: it.at, note: it.note }, ...rec.h].sort((a, b) => b.at - a.at).slice(0, MAX_HISTORY);
        }
        /* Joriy holat — eng kech vaqtli hodisa (tartibsiz kelsa ham). */
        const top = rec.h[0];
        rec.st = top.st; rec.at = top.at; rec.note = top.note; rec.u = now;
        next.set(it.k, rec);
      }
      for (const part of chunks([...next])) await this.storage.put(Object.fromEntries(part));
      return new Response(JSON.stringify({ saved: next.size }), { headers: { 'content-type': 'application/json' } });
    }
    if (request.method === 'POST' && url.pathname === '/get') {
      const { keys } = await request.json();
      const got = new Map();
      for (const part of chunks(keys)) for (const [k, v] of await this.storage.get(part)) got.set(k, v);
      return new Response(JSON.stringify(keys.map(k => got.get(k) || null)), { headers: { 'content-type': 'application/json' } });
    }
    if (request.method === 'DELETE' && url.pathname === '/purge') {
      const old = Date.now() - KEEP_DAYS * 86400000;
      let startAfter, removed = 0;
      for (;;) {
        const page = await this.storage.list({ prefix: 't:', limit: 500, ...(startAfter ? { startAfter } : {}) });
        if (!page.size) break;
        const dead = [];
        for (const [k, v] of page) { startAfter = k; if (!v || (v.u || 0) < old) dead.push(k); }
        for (const part of chunks(dead)) { await this.storage.delete(part); removed += part.length; }
        if (page.size < 500) break;
      }
      return new Response(JSON.stringify({ removed }), { headers: { 'content-type': 'application/json' } });
    }
    return new Response('not found', { status: 404 });
  }
}

const stub = env => env.TRACKS.get(env.TRACKS.idFromName('main'));

/* POST /partner/status. Body: bitta hodisa yoki { events: [...] };
   egasi uchun qo'shimcha `courier`. Javob: { ok, saved, rejected: [{ i, error }] }. */
export async function handlePartnerStatus({ request, env, json }) {
  if (!env.TRACKS) return json({ error: 'holat ombori ulanmagan' }, 503);
  const who = whoIs(env, request.headers.get('authorization'));
  if (!who) return json({ error: 'kalit noto\'g\'ri yoki yo\'q' }, 401);
  /* Hajm: sarlavhaga ishonib emas, o'qilgan matn bo'yicha ham (chunked so'rovda sarlavha yo'q). */
  const len = +(request.headers.get('content-length') || 0);
  if (len > MAX_BODY) return json({ error: 'juda katta (64 KB gacha)' }, 413);
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: 'juda katta (64 KB gacha)' }, 413);
  let body;
  try { body = JSON.parse(text); } catch (e) { return json({ error: 'JSON emas' }, 400); }
  const events = Array.isArray(body && body.events) ? body.events : [body];
  if (events.length > MAX_EVENTS) return json({ error: `bir so'rovda ${MAX_EVENTS} tagacha hodisa` }, 413);
  let courier = who.id;
  if (who.owner) {
    courier = String((body && body.courier) || '').toLowerCase();
    if (!/^[a-z0-9_-]{2,32}$/.test(courier)) return json({ error: 'egasi uchun courier kerak' }, 400);
  }
  const items = [], rejected = [];
  const now = Date.now();
  for (let i = 0; i < events.length; i++) {
    const e = parseEvent(events[i], now);
    if (e.error) { rejected.push({ i, error: e.error }); continue; }
    items.push({ k: await trackKey(courier, e.n), st: e.st, at: e.at, note: e.note });
  }
  let saved = 0;
  if (items.length) {
    const r = await stub(env).fetch('https://tracks/put', { method: 'POST', body: JSON.stringify({ items }) });
    saved = (await r.json()).saved || 0;
  }
  return json({ ok: items.length, saved, courier, rejected }, items.length || !events.length ? 200 : 400);
}

/* POST /track (ilova). Hamkor bo'lmagan kuryer uchun omborga murojaat yo'q —
   { c, found: false, partner: false }. */
export async function handleTrack({ request, env, json, originOk }) {
  if (!originOk) return json({ error: 'origin' }, 403);
  if (!env.TRACKS) return json({ r: [] });
  if (+(request.headers.get('content-length') || 0) > 8192) return json({ error: 'juda katta' }, 413);
  let body;
  try { body = JSON.parse((await request.text()).slice(0, 8192)); } catch (e) { return json({ error: 'JSON emas' }, 400); }
  const q = Array.isArray(body && body.q) ? body.q.slice(0, MAX_QUERY) : [];
  const partners = new Set([...partnerIds(env), TEST_COURIER]);
  const asks = [];
  const r = q.map(x => {
    const c = String((x && x.c) || '').toLowerCase(), n = normNumber(x && x.n);
    const out = { c, n, found: false, partner: partners.has(c) };
    if (out.partner && numberOk(n)) asks.push({ out, c, n });
    return out;
  });
  if (asks.length) {
    const keys = await Promise.all(asks.map(a => trackKey(a.c, a.n)));
    const got = await (await stub(env).fetch('https://tracks/get', { method: 'POST', body: JSON.stringify({ keys }) })).json();
    asks.forEach((a, i) => {
      const rec = got[i];
      if (!rec) return;
      Object.assign(a.out, { found: true, st: rec.st, at: new Date(rec.at).toISOString(), note: rec.note || '',
        h: (rec.h || []).map(e => ({ st: e.st, at: new Date(e.at).toISOString(), note: e.note || '' })) });
    });
  }
  return json({ r }, 200, { 'cache-control': 'no-store' });
}
