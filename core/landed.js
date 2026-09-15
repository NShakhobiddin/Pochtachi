/* Pochtam Core — jami tannarx (landed cost). Universal kalkulyator va AI
 * yordamchisi uchun bitta funksiya: tovar + ichki yetkazish + xalqaro kargo
 * + boj + yig'im = jami. Boj `customsDuty` (core/customs.js) dan, kargo
 * `tariffCost` (core/tariffs.js) yoki tayyor summadan keladi. Bu modul
 * qoida saqlamaydi, faqat qo'shadi va taqqoslaydi.
 *
 * Oddiy skript (brauzer: PochtamCore) va modul (Node, Worker) sifatida ishlaydi.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PochtamCore = Object.assign(root.PochtamCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var n = function (v) { var x = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/\s/g, '')); return isFinite(x) ? x : 0; };
  var pos = function (v) { return Math.max(0, n(v)); };
  var core = function () { return root.PochtamCore || (typeof module === 'object' && module.exports) || {}; };

  /* Kirish:
   *   priceUsd     — bitta mahsulot narxi, USD (valyutani chaqiruvchi o'giradi)
   *   qty          — miqdor (1)
   *   domesticUsd  — do'kon ichidagi yetkazish, USD (0)
   *   kg           — bitta mahsulot og'irligi
   *   dims         — { l, w, h, divisor } sm, ixtiyoriy (hajmiy og'irlik)
   *   shipUsd      — xalqaro kargo summasi, USD; berilmasa shipPerKg × hisob og'irligi
   *   shipPerKg    — kuryer tarifi $/kg (shipUsd bo'lmasa)
   *   freeUsd      — shu oyda qolgan bojsiz me'yor (norms.freeUsd)
   *   norms, usdRate
   *   localPriceUzs — O'zbekistondagi narx, so'm (ixtiyoriy, "foydalimi?")
   * Natija USD va so'mda, bo'laklar bilan. */
  function landedCost(o) {
    var C = core();
    var qty = Math.max(1, Math.round(pos(o.qty) || 1));
    var goods = pos(o.priceUsd) * qty;
    var domestic = pos(o.domesticUsd);
    var actualKg = pos(o.kg) * qty;
    var volKg = o.dims ? C.volumetricKg(o.dims.l, o.dims.w, o.dims.h, o.dims.divisor) : 0;
    var billKg = C.billableKg ? C.billableKg(actualKg, volKg) : Math.max(actualKg, volKg);
    var ship = o.shipUsd != null ? pos(o.shipUsd) : pos(o.shipPerKg) * billKg;
    var rate = pos(o.usdRate);
    var duty = C.customsDuty({ goodsUsd: goods + domestic, shipUsd: ship, kg: billKg, freeUsd: o.freeUsd, norms: o.norms, usdRate: rate });
    var totalUsd = goods + domestic + ship + duty.dutyUsd + duty.feeUsd;
    var totalUzs = totalUsd * rate;
    var out = {
      qty: qty, goodsUsd: goods, domesticUsd: domestic, shipUsd: ship,
      actualKg: actualKg, volKg: volKg, billKg: billKg,
      dutyUsd: duty.dutyUsd, feeUsd: duty.feeUsd, feeUzs: duty.feeUzs, basis: duty.basis, customs: duty,
      totalUsd: totalUsd, totalUzs: totalUzs, usdRate: rate,
      parts: [
        { k: 'goods', usd: goods }, { k: 'domestic', usd: domestic }, { k: 'ship', usd: ship },
        { k: 'duty', usd: duty.dutyUsd }, { k: 'fee', usd: duty.feeUsd }
      ]
    };
    /* "Olish foydalimi?": mahalliy narx berilsa tejash. */
    if (o.localPriceUzs != null && pos(o.localPriceUzs) > 0 && rate > 0) {
      var local = pos(o.localPriceUzs);
      out.localPriceUzs = local;
      out.savingUzs = local - totalUzs;
      out.savingPct = local > 0 ? (local - totalUzs) / local : 0;
      out.worth = totalUzs < local;
    }
    return out;
  }

  return { landedCost: landedCost };
});
