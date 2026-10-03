/* Pochtam Core — ulashish matni va havoladan mahsulot nomi va narxi.
 * Do'kon ilovasidagi "Ulashish" matni: "US $5.89 | Erkaklar krossovkasi
 * https://a.aliexpress.com/_x", "1.299,90 TL Ceket https://ty.gl/…".
 * Ilova buni o'zi (serversiz, AI'siz) o'qiydi; Worker esa havola sahifasi
 * narx bermasa shu funksiyani ishlatadi. Bitta funksiya — ikki joyda bir
 * xil natija.
 *
 * Oddiy skript (brauzer: PochtamCore) va modul (Node, Worker) sifatida ishlaydi.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PochtamCore = Object.assign(root.PochtamCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* "1,299.00" · "1.299,00" · "129.99" · "1 299" · "12900" → son. */
  function parsePrice(v) {
    if (typeof v === 'number') return isFinite(v) && v > 0 ? v : 0;
    var s = String(v == null ? '' : v).replace(/[\s  ']/g, '').replace(/[^\d.,]/g, '');
    if (!s) return 0;
    var lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    if (lc >= 0 && ld >= 0) s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (lc >= 0) s = /,\d{1,2}$/.test(s) && (s.match(/,/g) || []).length === 1 ? s.replace(',', '.') : s.replace(/,/g, '');
    else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
    var n = parseFloat(s);
    return isFinite(n) && n > 0 ? n : 0;
  }

  var CUR = [['US $', 'USD'], ['US$', 'USD'], ['USD', 'USD'], ['$', 'USD'], ['₺', 'TRY'], ['TL', 'TRY'], ['TRY', 'TRY'],
    ['€', 'EUR'], ['EUR', 'EUR'], ['£', 'GBP'], ['GBP', 'GBP'], ['руб.', 'RUB'], ['руб', 'RUB'], ['₽', 'RUB'], ['RUB', 'RUB'],
    ['¥', 'CNY'], ['CNY', 'CNY'], ['元', 'CNY'], ['₩', 'KRW'], ['KRW', 'KRW'], ['AED', 'AED'], ["so'm", 'UZS'], ['сум', 'UZS'], ['UZS', 'UZS']];
  var esc = function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  var SYM = CUR.map(function (c) { return esc(c[0]); }).join('|');
  var NUM = '\\d{1,3}(?:[\\s.,]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?';
  /* Lookbehind ishlatilmaydi (eski iOS WebView): oldingi belgi guruhga
     kiradi, almashtirishda u ham bo'shliq bo'ladi. */
  var RE = null, ADS = null, LETTERS = null;
  function init() {
    if (RE) return true;
    try {
      RE = new RegExp('(?:^|[^\\p{L}\\d])(?:(' + SYM + ')\\s?(' + NUM + ')|(' + NUM + ')\\s?(' + SYM + '))(?![\\p{L}\\d])', 'iu');
      ADS = new RegExp("check out this (product|item)[^:!.]*[:!.]?|look what i found[^:!.]*[:!.]?|i found this[^:!.]*[:!.]?|smarter shopping,? better living!?|aliexpress'?te bu ürün[^:!.]*[:!.]?|bu ürünü trendyol'?da[^:!.]*[:!.]?|trendyol'?da bu ürüne[^:!.]*[:!.]?|посмотри(те)?[^:!.]*aliexpress[^:!.]*[:!.]?|смотрите, что я нашел[^:!.]*[:!.]?", 'giu');
      LETTERS = new RegExp('\\p{L}{3}', 'u');
      return true;
    } catch (e) { return false; }
  }

  /* Javob: { name, price, currency } (topilmasa '' / 0). So'mdagi summa
     narx sifatida olinmaydi (do'kon narxi emas). */
  function shareHint(text) {
    var s = String(text || '').slice(0, 600).replace(/https?:\/\/\S+/gi, ' ');
    if (!init()) return { name: '', price: 0, currency: '' };
    var price = 0, currency = '';
    var m = RE.exec(s);
    if (m) {
      var sym = (m[1] || m[4] || '').toLowerCase();
      var f = CUR.filter(function (c) { return c[0].toLowerCase() === sym; })[0];
      price = parsePrice(m[2] || m[3]);
      currency = f ? f[1] : '';
      if (currency === 'UZS') price = 0;
      s = s.replace(m[0], ' ');
    }
    var name = s.replace(ADS, ' ').replace(/\s+/g, ' ').replace(/^[\s|:–—·•\-!.,]+|[\s|:–—·•\-!.,]+$/g, '').trim();
    return { name: LETTERS.test(name) ? name.slice(0, 120) : '', price: currency && price > 0 ? price : 0, currency: price > 0 ? currency : '' };
  }

  /* Havoladagi nom: trendyol.com/<brend>/<nom>-p-<id> — sahifa ochilmasa
     (Trendyol serverlarga captcha ko'rsatadi) nom shu yerdan. Boshqa
     do'konlarda — eng uzun "so'z-so'z-so'z" bo'lagi. */
  var titleWords = function (s) {
    return s.split('-').filter(Boolean).slice(0, 14)
      .map(function (w) { return /^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1); }).join(' ');
  };
  function slugName(href) {
    var x;
    try { x = new URL(String(href || '')); } catch (e) { return ''; }
    var segs = x.pathname.split('/').filter(Boolean).map(function (s) { try { return decodeURIComponent(s); } catch (e) { return s; } });
    var TY = /^(.+?)-p-\d+$/i;
    var i = -1;
    for (var k = 0; k < segs.length; k++) if (TY.test(segs[k])) { i = k; break; }
    if (i >= 0) {
      var words = segs[i].replace(TY, '$1'), brand = i > 0 ? segs[i - 1] : '';
      return titleWords((brand && words.toLowerCase().indexOf(brand.toLowerCase()) !== 0 ? brand + '-' : '') + words).slice(0, 120);
    }
    if (!init()) return '';
    var WORDY = new RegExp('^[\\p{L}\\d]+(-[\\p{L}\\d]+){2,}$', 'u');
    var c = segs.filter(function (s) { return WORDY.test(s) && LETTERS.test(s); }).sort(function (a, b) { return b.length - a.length; })[0];
    return c ? titleWords(c).slice(0, 120) : '';
  }

  return { shareHint: shareHint, slugName: slugName, sharePrice: parsePrice };
});
