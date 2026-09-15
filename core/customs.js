/* Pochtam Core — bojxona hisobi. Yagona formula: ilova kalkulyatori, reja
 * sehrgari, motion-namuna, qo'llanma kalkulyatori va AI yordamchisi (Worker)
 * hammasi shu funksiyani chaqiradi. Boj stavkasi, me'yor, BHM va yig'im
 * ulushi bu yerda yozilmaydi — ular `norms` parametri bilan keladi
 * (ilovada `data/norms.json`).
 *
 * Qoida (VMQ 244-son): bir kalendar oyda `freeUsd` gacha bojsiz. Ortiqcha
 * qism tovar qiymatidan olinadi; yetkazish xarajatining shu ortiqcha
 * qismga to'g'ri keladigan ulushi bojxona qiymatiga qo'shiladi. Boj —
 * qiymatning `dutyPct` ulushi yoki har kg uchun `minPerKg` (ortiqcha
 * qismga to'g'ri keladigan vazn bo'yicha), qaysi katta bo'lsa. Boj bo'lsa
 * ustiga BHM ning `feeShare` ulushi miqdorida yig'im (so'mda) qo'shiladi.
 *
 * Fayl oddiy skript sifatida (brauzer: `PochtamCore`) ham, modul sifatida
 * (Node testlari, Cloudflare Worker) ham ishlaydi.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PochtamCore = Object.assign(root.PochtamCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var n = function (v) { var x = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : 0; };
  var pos = function (v) { return Math.max(0, n(v)); };

  /* Me'yorlar ro'yxatidan berilgan sanaga mos oxirgisini tanlaydi
     (`from` — kuchga kirish sanasi, ISO). Ro'yxat bo'sh bo'lsa null. */
  function normsAt(list, date) {
    if (!Array.isArray(list) || !list.length) return null;
    var d = date ? (typeof date === 'string' ? date : date.toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
    var cur = null;
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].from && list[i].from <= d) cur = list[i];
    return cur || list[0];
  }

  /* Boj va yig'im.
   *   goodsUsd  — tovar qiymati (tovar + ichki yetkazish + mahalliy soliq), USD
   *   shipUsd   — xalqaro yetkazishning to'liq summasi, USD
   *   kg        — hisob og'irligi (haqiqiy yoki hajmiy, kattasi)
   *   freeUsd   — shu oyda qolgan bojsiz me'yor; berilmasa norms.freeUsd
   *   norms     — { freeUsd, dutyPct, minPerKg, bhm, feeShare, src }
   *   usdRate   — 1 USD necha so'm
   * Natija USD va so'mda; `basis`: 'none' | 'value' | 'weight'. */
  function customsDuty(o) {
    var N = o.norms || {};
    var goods = pos(o.goodsUsd), ship = pos(o.shipUsd), kg = pos(o.kg);
    var free = o.freeUsd == null ? n(N.freeUsd) : pos(o.freeUsd);
    var rate = pos(o.usdRate);
    var excessGoods = Math.max(0, goods - free);
    var ratio = goods > 0 ? excessGoods / goods : 0;
    var excessKg = kg * ratio;
    var cv = excessGoods + ship * ratio;
    var byValue = cv * n(N.dutyPct);
    var byWeight = excessKg * n(N.minPerKg);
    var dutyUsd = cv > 0 ? Math.max(byValue, byWeight) : 0;
    var feeUzs = cv > 0 ? n(N.bhm) * n(N.feeShare) : 0;
    var dutyUzs = dutyUsd * rate;
    return {
      cv: cv, excessGoods: excessGoods, ratio: ratio,
      excessKg: excessKg, excessWeight: excessKg,
      byValue: byValue, byWeight: byWeight,
      dutyUsd: dutyUsd, dutyUzs: dutyUzs, duty: dutyUzs,
      feeUzs: feeUzs, fee: feeUzs, feeUsd: rate > 0 ? feeUzs / rate : 0,
      totalUzs: dutyUzs + feeUzs, total: dutyUzs + feeUzs,
      basis: cv <= 0 ? 'none' : (byWeight > byValue ? 'weight' : 'value'),
      norms: N, usdRate: rate
    };
  }

  /* Hajmiy og'irlik: sm³ / bo'luvchi (odatda 5000 yoki 6000). */
  function volumetricKg(l, w, h, divisor) {
    var d = pos(divisor) || 5000;
    return pos(l) * pos(w) * pos(h) / d;
  }

  /* Hisob og'irligi: haqiqiy va hajmiyning kattasi. */
  function billableKg(actualKg, volKg) { return Math.max(pos(actualKg), pos(volKg)); }

  return { normsAt: normsAt, customsDuty: customsDuty, volumetricKg: volumetricKg, billableKg: billableKg, num: n };
});
