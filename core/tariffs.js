/* Pochtam Core — kuryer tariflari. Ma'lumot `data/tariffs.json` dan keladi
 * (kuryer id → tarif qatorlari: `brackets` vazn oralig'i bo'yicha, `perkg` kg
 * uchun narx, `quote` narx so'raladi). Bu modul faqat hisoblaydi: berilgan
 * yo'nalish va og'irlik uchun har kuryerning taxminiy summasi dollarda,
 * so'ng arzon / tez / optimal tartib. Narxlar bu yerda yozilmaydi.
 *
 * Oddiy skript (brauzer: PochtamCore) va modul (Node, Worker) sifatida ishlaydi.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PochtamCore = Object.assign(root.PochtamCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var n = function (v) { var x = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/\s/g, '')); return isFinite(x) ? x : 0; };
  var pos = function (v) { return Math.max(0, n(v)); };

  /* Davlat nomlarini bir xil kalitga keltiradi: "AQSh", "AQSH", "USA" → "aqsh";
     "Angliya", "Buyuk Britaniya", "UK" → "angliya". */
  var ALIAS = {
    usa: 'aqsh', 'amerika': 'aqsh', 'united states': 'aqsh', us: 'aqsh',
    uk: 'angliya', 'buyuk britaniya': 'angliya', england: 'angliya', 'britaniya': 'angliya',
    china: 'xitoy', 'janubiy koreya': 'koreya', 'south korea': 'koreya', korea: 'koreya',
    turkey: 'turkiya', germany: 'germaniya', 'deutschland': 'germaniya', uae: 'baa', 'dubay': 'baa', dubai: 'baa',
    'rossiya': 'rossiya', russia: 'rossiya', 'qozogiston': 'qozogiston', 'qirgiziston': 'qirgiziston'
  };
  function countryKey(s) {
    var k = String(s || '').toLowerCase().replace(/[‘’'`ʻʼ]/g, '').replace(/\s+/g, ' ').trim();
    return ALIAS[k] || k;
  }

  /* Valyutani dollarga o'giradi. fx: { EUR, GBP } (1 birlik necha USD);
     UZS uchun usdRate (1 USD necha so'm). */
  function toUsd(amount, currency, fx, usdRate) {
    var c = String(currency || 'USD').toUpperCase();
    if (c === 'USD') return amount;
    if (c === 'UZS') return usdRate > 0 ? amount / usdRate : null;
    var r = fx && n(fx[c]);
    return r > 0 ? amount * r : null;
  }

  /* Bitta tarif qatori uchun summa. kg — hisob og'irligi.
     Natija: { ok, usd, amount, currency, kind, from, minKg, over, note }.
     perkg tarifda eng kam 0,5 kg hisoblanadi (kuryerlar odatda shundan
     boshlaydi) — `minKg` bilan o'zgartirish mumkin. */
  function tariffCost(t, kg, opt) {
    opt = opt || {};
    var w = pos(kg), fx = opt.fx || {}, rate = pos(opt.usdRate);
    var res = { ok: false, usd: null, amount: null, currency: t && t.currency || 'USD', kind: t && t.kind || 'quote', from: !!(t && t.from), over: false, note: t && t.note || '' };
    if (!t || t.kind === 'quote') return res;
    var amount = null;
    if (t.kind === 'perkg') {
      var minKg = opt.minKg == null ? 0.5 : pos(opt.minKg);
      amount = n(t.price) * Math.max(w, minKg);
      res.minKg = minKg;
    } else if (t.kind === 'brackets' && Array.isArray(t.rows) && t.rows.length) {
      var row = null;
      for (var i = 0; i < t.rows.length; i++) if (w <= n(t.rows[i].upTo) + 1e-9) { row = t.rows[i]; break; }
      if (!row) { res.over = true; res.note = res.note || ('eng ko\'p ' + t.rows[t.rows.length - 1].upTo + ' kg'); return res; }
      if (row.per === 'kg') amount = n(row.price) * w;
      else if (row.per === '100g') amount = n(row.price) * w * 10;
      else amount = n(row.price);
    } else return res;
    var usd = toUsd(amount, t.currency, fx, rate);
    if (usd == null) return res;
    res.ok = true; res.amount = amount; res.usd = usd;
    return res;
  }

  /* Berilgan yo'nalish va og'irlik uchun barcha kuryerlarning takliflari.
     couriers — ilovadagi COURIERS (id, name, days, dnum, price, mode…),
     tariffs — data/tariffs.json ({ fx, couriers: { id: [qatorlar] } }).
     Har kuryer uchun mos tarif qatorlari (davlat bo'yicha) hisoblanadi;
     bir kuryerda bir necha variant bo'lsa (avia/avto) har biri alohida. */
  function courierQuotes(o) {
    var ck = countryKey(o.country), kg = pos(o.kg), out = [];
    var data = o.tariffs || {}, fx = data.fx || {}, rate = pos(o.usdRate);
    (o.couriers || []).forEach(function (c) {
      var rows = (data.couriers && data.couriers[c.id]) || [];
      rows.forEach(function (t) {
        if (ck && countryKey(t.c) !== ck) return;
        var cost = tariffCost(t, kg, { fx: fx, usdRate: rate, minKg: o.minKg });
        out.push({
          id: c.id, name: c.name, country: t.c, text: t.text, days: t.days || c.days || '',
          dnum: t.dnum != null ? t.dnum : (c.dnum < 90 ? c.dnum : null),
          mode: c.mode || '', tracking: !!c.tracking,
          ok: cost.ok, usd: cost.usd, amount: cost.amount, currency: cost.currency,
          kind: cost.kind, from: cost.from, over: cost.over, note: cost.note, tariff: t
        });
      });
    });
    return out;
  }

  /* Tartib: 'cheap' — arzonidan; 'fast' — tezidan (muddat, keyin narx);
     'optimal' — narx va muddat normallashtirilib qo'shiladi (0,6 narx + 0,4
     muddat). Narxi noma'lum (quote/over) takliflar oxirida. */
  function rankQuotes(quotes, priority) {
    var ok = quotes.filter(function (q) { return q.ok; }), rest = quotes.filter(function (q) { return !q.ok; });
    var maxUsd = Math.max.apply(null, ok.map(function (q) { return q.usd; }).concat([0])) || 1;
    var known = ok.filter(function (q) { return q.dnum != null; });
    var maxD = Math.max.apply(null, known.map(function (q) { return q.dnum; }).concat([0])) || 1;
    var score = function (q) {
      var d = q.dnum == null ? maxD : q.dnum;
      return 0.6 * (q.usd / maxUsd) + 0.4 * (d / maxD);
    };
    var cmp = priority === 'fast'
      ? function (a, b) { return ((a.dnum == null ? 1e9 : a.dnum) - (b.dnum == null ? 1e9 : b.dnum)) || (a.usd - b.usd); }
      : priority === 'optimal'
        ? function (a, b) { return score(a) - score(b) || a.usd - b.usd; }
        : function (a, b) { return (a.usd - b.usd) || ((a.dnum == null ? 1e9 : a.dnum) - (b.dnum == null ? 1e9 : b.dnum)); };
    return ok.slice().sort(cmp).concat(rest);
  }

  return { countryKey: countryKey, toUsd: toUsd, tariffCost: tariffCost, courierQuotes: courierQuotes, rankQuotes: rankQuotes };
});
