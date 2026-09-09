/* Worker'ning sof qismlari uchun test: beacon tahlili va Durable Object
   sanog'i (SQLite o'rniga xotiradagi soxta storage). `node test.mjs`. */
import worker, { parseBeacon, Counter } from './src/index.js';

let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? '  ok  ' : ' XATO '} ${name}${info ? ' — ' + info : ''}`); if (!ok) fails++; };

/* --- parseBeacon --- */
const body = JSON.stringify({ v: 'v1.0.0 · 19.08.2026', l: 'uz', e: [
  { n: 'screen', k: 'stores', t: 1 }, { n: 'screen', k: 'stores', t: 2 }, { n: 'store', k: 'taobao', t: 3 },
  { n: 'hack', k: 'x' }, { n: 'guide', k: 'a'.repeat(100) }, { n: 'svcAsk', k: 'svc-hisob' }, { n: 'courier' }
] });
const rows = parseBeacon(body, '2026-09-09');
const get = (n, k) => (rows.find(r => r.name === n && r.key === k) || {}).n;
check('bir xil hodisa qo\'shiladi', get('screen', 'stores') === 2);
check('do\'kon sanaladi', get('store', 'taobao') === 1);
check('begona hodisa tashlanadi', !rows.some(r => r.name === 'hack'));
check('kalit 40 belgiga qisqaradi', get('guide', 'a'.repeat(40)) === 1);
check('kalitsiz hodisa "-" bo\'ladi', get('courier', '-') === 1);
check('til va versiya sanaladi', get('lang', 'uz') === 1 && get('ver', 'v1.0.0 · 19.08.2026') === 1);
check('hamma qator bugungi kun', rows.every(r => r.day === '2026-09-09'));
check('buzuq JSON — bo\'sh', parseBeacon('{oops', '2026-09-09').length === 0);
check('hodisasiz beacon — bo\'sh', parseBeacon(JSON.stringify({ v: 'x', l: 'ru', e: [] }), '2026-09-09').length === 0);
const many = JSON.stringify({ e: Array.from({ length: 200 }, (_, i) => ({ n: 'screen', k: 'k' + i })) });
check('60 tadan ortiq hodisa olinmaydi', parseBeacon(many, '2026-09-09').filter(r => r.name === 'screen').length === 60);

/* --- Counter (soxta SQLite: faqat shu yerda ishlatiladigan 4 ta so'rov) --- */
function fakeSql() {
  const rowsDb = new Map();
  return { exec(q, ...a) {
    if (q.startsWith('CREATE')) return [];
    if (q.startsWith('INSERT')) { const id = a.slice(0, 3).join('|'); const r = rowsDb.get(id) || { day: a[0], name: a[1], key: a[2], n: 0 }; r.n += a[3]; rowsDb.set(id, r); return []; }
    if (q.startsWith('SELECT')) return [...rowsDb.values()].filter(r => r.day >= a[0]).sort((x, y) => x.day.localeCompare(y.day) || x.name.localeCompare(y.name) || y.n - x.n);
    if (q.startsWith('DELETE')) { for (const [id, r] of rowsDb) if (r.day < a[0]) rowsDb.delete(id); return []; }
    throw new Error('kutilmagan so\'rov: ' + q);
  } };
}
const today = new Date().toISOString().slice(0, 10);
const c = new Counter({ storage: { sql: fakeSql() } }, { ALLOW_ORIGIN: 'https://x' });
await c.fetch(new Request('https://counter/add', { method: 'POST', body: JSON.stringify(parseBeacon(body, today)) }));
await c.fetch(new Request('https://counter/add', { method: 'POST', body: JSON.stringify(parseBeacon(body, today)) }));
await c.fetch(new Request('https://counter/add', { method: 'POST', body: JSON.stringify([{ day: '2020-01-01', name: 'screen', key: 'old', n: 1 }]) }));
const st = await (await c.fetch(new Request('https://counter/stats?days=7'))).json();
check('sanoq jamlanadi', st.byName.screen.stores === 4 && st.byName.store.taobao === 2, JSON.stringify(st.byName.screen));
check('kun bo\'yicha ekran soni', st.byDay[today] === 4);
check('eski kun oynaga kirmaydi', !('old' in (st.byName.screen || {})));
check('kalitlar kamayish tartibida', Object.keys(st.byName.guide)[0] === 'a'.repeat(40));
await c.fetch(new Request('https://counter/purge', { method: 'DELETE' }));
const st2 = await (await c.fetch(new Request('https://counter/stats?days=90'))).json();
check('purge eski qatorni o\'chiradi', !Object.values(st2.byName).some(o => 'old' in o));

/* --- Butun Worker: yo'llar (soxta env, Counter yuqoridagi soxta SQLite bilan) --- */
const env = { ALLOW_ORIGIN: 'https://x', READ_TOKEN: 'sir', PUBLIC_STATS: '0', COUNTER: { idFromName: () => 'main', get: () => ({ fetch: (u, i) => c.fetch(new Request(u, i)) }) } };
const ctx = { waitUntil: p => p };
const hit = (path, init) => worker.fetch(new Request('https://w' + path, init), env, ctx);
check('GET / — ok', (await (await hit('/')).text()) === 'ok');
check('POST / begona Origin — 403', (await hit('/', { method: 'POST', headers: { origin: 'https://boshqa' }, body })).status === 403);
check('POST / o\'z Origin — 204', (await hit('/', { method: 'POST', headers: { origin: 'https://x' }, body })).status === 204);
check('/stats tokensiz — 401', (await hit('/stats')).status === 401);
check('/stats ?token= bilan — 200', (await hit('/stats?token=sir')).status === 200);
const hs = await hit('/hisobot');
const html = await hs.text();
check('/hisobot — HTML sahifa', hs.status === 200 && /text\/html/.test(hs.headers.get('content-type')) && html.includes('<title>Pochtam hisobot</title>'));
check('/hisobot tashqi resurssiz', !/src="http|href="http/.test(html));
check('/hisobot parolni manzilda saqlamaydi', html.includes("history.replaceState(null,'',location.pathname)"));
check('/hisobot yorliqlar to\'liq', ['Do\'konga o\'tish', 'Pullik xizmat', 'Boj hisobini tekshirish', 'Bosh sahifa'].every(t => html.includes(t)));
check('/hisobot indekslanmaydi', hs.headers.get('x-robots-tag') === 'noindex');

console.log(fails ? `\n${fails} ta tekshiruv o'tmadi.` : '\nWorker testlari o\'tdi.');
process.exit(fails ? 1 : 0);
