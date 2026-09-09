/* Qo'llanmaning motion-tushuntirishlari ("videolar").
 *
 * Har qo'llanma o'z skriptida `MOTION` ni e'lon qiladi:
 *   { store, color, from, flow:'courier'|'direct', days, id, free, val,
 *     chan:'courier'|'post', ex:{price,kg}, air, road, cargo:[nomlar],
 *     sizeKind:'cloth'|'shoe', pay:[...], videos:{ 'p-start':{...}, ... } }
 * Har panel tepasiga bittadan karta qo'yiladi: Boshlash (umumiy jarayon),
 * Bosqichlar (qo'llanmaning o'z qadamlari), Bojxona, Yetkazish va
 * O'lchamlar / Xavfsizlik / Originallik. Har video 6–12 qadam: sarlavha va
 * batafsil izoh, qadam davomiyligi matn uzunligiga qarab, segmentli vaqt
 * chizig'i, oxirida keyingi bo'limga o'tuvchi tugma.
 *
 * Sahnalar umumiy kutubxonadan (SC), do'kon nomi, rangi, davlat, ID va
 * misol raqamlari parametr sifatida kiradi — shuning uchun yetti qo'llanma
 * bitta koddan foydalanadi. Bojxona, Yetkazish va O'lchamlar videolari
 * standart ssenariy bilan keladi (DEF), qo'llanma ularni to'liq almashtirishi
 * yoki `note` bilan o'ziga xos qadam qo'shishi mumkin. Video fayl yo'q,
 * hammasi shu yerda; harakatni kamaytirish rejimida sahnalar statik kadr
 * (guide-common.css). Qo'llanmalar faqat o'zbekcha, tarjima yo'q. */
(function () {
  if (typeof MOTION === 'undefined' || !MOTION || !MOTION.store) return;
  var M = MOTION;
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  var P = {
    store: esc(M.store), color: M.color || '#1A1FB0', from: esc(M.from || 'Xitoy'), days: esc(M.days || ''),
    id: esc(M.id || 'UZ-48213'), free: esc(M.free || '$200'), val: esc(M.val || '$150'),
    chan: M.chan || (M.flow === 'direct' ? 'post' : 'courier'), flow: M.flow || 'courier',
    ex: M.ex || { price: '$150', kg: '1,2 kg' }, air: M.air || 10, road: M.road || 0,
    cargo: M.cargo || [], sizeKind: M.sizeKind || 'cloth', pay: M.pay || ['Xalqaro karta']
  };
  var PRI = '#1A1FB0', LIGHT = '#E9EAFD', GREY = '#E3E4EE', INK = '#131429', MUTED = '#6B6C85', MUTED2 = '#A6A7BC',
    GRN = '#0F7B3E', GRNB = '#E9F8EF', RED = '#B42318', REDB = '#FCEAEA', AMB = '#B45309', AMBB = '#FDF3E3', W = '#FFFFFF', SOFT = '#F1F1F8';

  /* ---------- SVG yordamchilari (360x200) ---------- */
  var dl = function (d) { return d ? ' style="animation-delay:' + d + 's"' : ''; };
  var G = function (cls, d, inner) { return '<g class="' + cls + '"' + dl(d) + '>' + inner + '</g>'; };
  var R = function (x, y, w, h, rx, fill, stroke, cls, d) {
    return '<rect' + (cls ? ' class="' + cls + '"' : '') + dl(d) + ' x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="2"' : '') + '></rect>';
  };
  var T = function (x, y, t, sz, wt, fill, a, cls, d) {
    return '<text' + (cls ? ' class="' + cls + '"' : '') + dl(d) + ' x="' + x + '" y="' + y + '"' + (a && a !== 'start' ? ' text-anchor="' + a + '"' : '') + ' font-size="' + sz + '" font-weight="' + wt + '" fill="' + fill + '">' + t + '</text>';
  };
  var chk = function (x, y, d, r) {
    r = r || 13; var k = r / 13;
    return G('gm-pop', d, '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + GRNB + '"></circle><path d="M' + (x - 6.5 * k) + ' ' + y + 'l' + 4.5 * k + ' ' + 4.5 * k + ' ' + 8.5 * k + '-' + 9 * k + '" fill="none" stroke="' + GRN + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path>');
  };
  var warn = function (x, y, d) { return G('gm-pop', d, '<circle cx="' + x + '" cy="' + y + '" r="12" fill="' + RED + '"></circle>' + T(x, y + 5, '!', 14, 800, W, 'middle')); };
  var parcel = function (x, y, w, h, cls, d, fill, stroke) {
    fill = fill || AMBB; stroke = stroke || AMB;
    return G(cls || 'gm-pop', d, R(x, y, w, h, Math.min(16, Math.floor(w / 6)), fill, stroke) + '<path d="M' + x + ' ' + (y + h / 2) + 'h' + w + 'M' + (x + w / 2) + ' ' + y + 'v' + h + '" stroke="' + stroke + '" stroke-width="2" opacity=".4"></path>');
  };
  var chip = function (x, y, w, label, bg, fg, cls, d, sz) {
    return G(cls || 'gm-in', d, R(x, y, w, 34, 10, bg, bg === W ? GREY : null) + T(x + w / 2, y + 22, label, sz || 12, 700, fg, 'middle'));
  };
  var phone = function (x, w, h, d) {
    x = x || 116; w = w || 128; h = h || 172;
    return G('gm-in', d, R(x, 14, w, h, 18, INK) + R(x + 8, 28, w - 16, h - 30, 12, W) + R(x + w / 2 - 14, 20, 28, 4, 2, '#4E4F6B'));
  };
  var header = function (x, w, label, d) { return G('gm-in', d, R(x + 8, 28, w - 16, 26, 12, P.color) + R(x + 8, 42, w - 16, 12, 0, P.color) + T(x + w / 2, 46, label, 11, 800, W, 'middle')); };
  var lines = function (x, y, ws, d) { var s = ''; for (var i = 0; i < ws.length; i++) s += R(x, y + i * 12, ws[i], 6, 3, GREY); return G('gm-in', d, s); };
  var meter = function (y, fillW, overW, d1, d2) {
    return R(40, y, 280, 22, 11, GREY) + R(40, y, fillW, 22, 11, PRI, null, 'gm-grow', d1) + (overW ? R(40 + fillW, y, overW, 22, 11, RED, null, 'gm-grow', d2) : '') +
      '<line x1="' + (40 + fillW) + '" y1="' + (y - 8) + '" x2="' + (40 + fillW) + '" y2="' + (y + 30) + '" stroke="' + INK + '" stroke-width="2" stroke-dasharray="3 3"></line>';
  };
  var arrowR = function (x, y, d) { return G('gm-in', d, '<path d="M' + x + ' ' + y + 'h24" stroke="' + MUTED2 + '" stroke-width="2.2" stroke-linecap="round"></path><path d="M' + (x + 18) + ' ' + (y - 6) + 'l7 6-7 6" fill="none" stroke="' + MUTED2 + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>'); };
  var arrowD = function (x, y, d) { return G('gm-in', d, '<path d="M' + x + ' ' + y + 'v16" stroke="' + MUTED2 + '" stroke-width="2.2" stroke-linecap="round"></path>'); };
  var house = function (x, y, d) { return G('gm-in', d, '<path d="M' + x + ' ' + (y + 24) + 'l26-24 26 24v24h-52z" fill="' + LIGHT + '" stroke="' + PRI + '" stroke-width="2" stroke-linejoin="round"></path>' + R(x + 18, y + 32, 16, 16, 3, PRI)); };
  var building = function (x, y, label, d) {
    return G('gm-in', d, R(x, y, 110, 96, 14, LIGHT, PRI) + R(x + 40, y + 54, 30, 42, 6, PRI) + R(x + 14, y + 16, 20, 16, 4, W) + R(x + 44, y + 16, 20, 16, 4, W) + R(x + 74, y + 16, 20, 16, 4, W) + (label ? T(x + 55, y - 10, label, 12, 700, PRI, 'middle') : ''));
  };
  var plane = function (cls, d) { return G(cls || 'gm-fly', d, '<path d="M150 100l22-9-4 9 4 9-22-9z" fill="' + PRI + '"></path>' + R(150, 97, 16, 6, 3, '#494FE9')); };
  var truck = function (cls, d) { return G(cls || 'gm-in', d, R(30, 104, 86, 44, 10, PRI) + R(116, 118, 30, 30, 8, '#494FE9') + '<circle cx="52" cy="152" r="9" fill="' + INK + '"></circle><circle cx="124" cy="152" r="9" fill="' + INK + '"></circle>' + R(48, 112, 40, 30, 6, AMBB, AMB)); };
  var note = function (t, d, y) { return T(180, y || 184, t, 11, 600, MUTED, 'middle', 'gm-in', d); };
  var row = function (x, y, w, k, v, d, vfill) {
    return G('gm-in', d, R(x, y, w, 26, 8, SOFT) + T(x + 10, y + 17, k, 11, 600, MUTED) + (v ? T(x + w - 10, y + 17, v, 11, 800, vfill || INK, 'end') : R(x + w - 70, y + 9, 60, 8, 4, GREY)));
  };

  /* ---------- sahna kutubxonasi ---------- */
  var p = function (o, k, dflt) { return o && o[k] !== undefined ? esc(o[k]) : dflt; };
  var SC = {
    brand: function (o) {
      return phone() + header(116, 128, P.store) +
        G('gm-pop', .9, R(136, 64, 88, 56, 10, SOFT) + R(146, 72, 68, 26, 6, GREY) + R(146, 104, 40, 6, 3, MUTED2)) +
        G('gm-pop', 1.4, R(136, 128, 88, 30, 10, P.color) + T(180, 147, p(o, 'btn', 'Buyurtma'), 11, 700, W, 'middle')) +
        chip(20, 76, 88, p(o, 'tag1', P.from), W, INK, 'gm-in', 1.9, 11) + chip(252, 76, 92, p(o, 'tag2', 'Kuryer'), LIGHT, PRI, 'gm-in', 2.3, 11);
    },
    routes: function (o) {
      var names = (o && o.names) || ['Kuryer', 'Vositachi', "To'g'ridan"], best = (o && o.best) || 0, s = '';
      for (var i = 0; i < 3; i++) {
        var on = i === best;
        s += G(on ? 'gm-pop' : 'gm-in', .3 + i * .4, R(40 + i * 96, 60, 88, 60, 14, on ? PRI : W, on ? null : GREY) + T(84 + i * 96, 96, esc(names[i]), 12, 700, on ? W : MUTED, 'middle'));
      }
      return s + chk(128 + best * 96, 60, 1.8, 12) + note(p(o, 'note', 'tavsiya etilgan yo\'l belgilangan'), 2.4, 160);
    },
    idcard: function (o) {
      return building(44, 52, 'Ombor · ' + p(o, 'from', P.from)) +
        G('gm-in', .6, R(196, 56, 124, 92, 12, W, GREY) + lines(210, 70, [70, 96, 56])) +
        G('gm-pop', 1.4, R(206, 112, 104, 24, 8, AMBB, AMB) + T(258, 129, 'ID ' + p(o, 'id', P.id), 11, 800, AMB, 'middle')) +
        note(p(o, 'note', 'manzil + ID kod — buyurtmaga'), 2.2);
    },
    register: function (o) {
      return phone() + header(116, 128, P.store) +
        G('gm-in', .6, R(134, 66, 92, 26, 8, SOFT) + T(142, 83, p(o, 'code', '+998'), 11, 800, INK) + R(178, 75, 40, 8, 4, GREY)) +
        G('gm-in', 1.1, R(134, 100, 92, 26, 8, SOFT) + T(180, 117, p(o, 'sms', 'SMS · 4 8 2 1'), 11, 700, MUTED, 'middle')) +
        G('gm-pop', 1.7, R(134, 136, 92, 28, 8, P.color) + T(180, 154, p(o, 'btn', 'Tasdiqlash'), 11, 700, W, 'middle')) + chk(226, 136, 2.3, 12) +
        note(p(o, 'note', 'telefon raqami + SMS kod'), 2.6);
    },
    app: function (o) {
      return phone() + G('gm-pop', .5, R(150, 60, 60, 60, 16, P.color) + T(180, 98, p(o, 'glyph', 'App'), 20, 800, W, 'middle')) +
        G('gm-in', 1.2, R(140, 132, 80, 24, 8, SOFT) + T(180, 148, p(o, 'sub', 'App Store'), 10, 700, MUTED, 'middle')) +
        chip(20, 76, 88, p(o, 'l', 'iPhone'), W, INK, 'gm-in', 1.8, 11) + chip(252, 76, 92, p(o, 'r', 'Android'), W, INK, 'gm-in', 2.2, 11);
    },
    translate: function (o) {
      return G('gm-in', 0, R(40, 50, 130, 100, 14, W, GREY) + T(105, 92, p(o, 'zh', '淘宝'), 26, 800, INK, 'middle') + R(70, 112, 70, 8, 4, GREY)) +
        arrowR(176, 100, .8) +
        G('gm-pop', 1.3, R(210, 50, 110, 100, 14, LIGHT) + T(265, 92, p(o, 'uz', 'Taobao'), 16, 800, PRI, 'middle') + T(265, 118, p(o, 'sub', 'tarjima'), 11, 700, MUTED, 'middle')) +
        note(p(o, 'note', 'kamera tarjimasi yoki brauzer tarjimasi'), 2.2);
    },
    search: function (o) {
      return G('gm-in', 0, R(40, 40, 280, 36, 12, W, GREY) + '<circle cx="62" cy="58" r="7" fill="none" stroke="' + MUTED2 + '" stroke-width="2.2"></circle><path d="M67 63l5 5" stroke="' + MUTED2 + '" stroke-width="2.2" stroke-linecap="round"></path>' + T(80, 63, p(o, 'q', 'krossovka'), 12, 700, INK)) +
        G('gm-pop', .8, R(288, 46, 24, 24, 6, LIGHT) + '<rect x="294" y="52" width="12" height="9" rx="2" fill="none" stroke="' + PRI + '" stroke-width="1.8"></rect><circle cx="300" cy="56.5" r="2" fill="' + PRI + '"></circle>') +
        G('gm-in', 1.2, R(40, 90, 86, 80, 12, SOFT) + R(48, 98, 70, 44, 8, GREY) + T(83, 160, p(o, 'p1', '$12'), 11, 800, INK, 'middle')) +
        G('gm-in', 1.5, R(137, 90, 86, 80, 12, SOFT) + R(145, 98, 70, 44, 8, GREY) + T(180, 160, p(o, 'p2', '$14'), 11, 800, INK, 'middle')) +
        G('gm-in', 1.8, R(234, 90, 86, 80, 12, SOFT) + R(242, 98, 70, 44, 8, GREY) + T(277, 160, p(o, 'p3', '$11'), 11, 800, INK, 'middle')) +
        chip(200, 178, 120, p(o, 'filter', 'saralash: sotuv'), LIGHT, PRI, 'gm-pop', 2.3, 10).replace('height="34"', 'height="20"').replace('y="200"', 'y="192"');
    },
    seller: function (o) {
      return G('gm-in', 0, R(50, 40, 260, 120, 14, W, GREY) + '<circle cx="82" cy="70" r="16" fill="' + LIGHT + '"></circle>' + T(108, 66, p(o, 'name', 'Do\'kon'), 12, 800, INK) + T(108, 82, p(o, 'sub', 'reyting · sotuv soni'), 10, 600, MUTED)) +
        G('gm-in', .6, T(66, 116, p(o, 'k1', 'Reyting'), 11, 600, MUTED) + T(294, 116, p(o, 'v1', '4,8 ★'), 12, 800, GRN, 'end')) +
        G('gm-in', 1.0, T(66, 140, p(o, 'k2', 'Sotuv'), 11, 600, MUTED) + T(294, 140, p(o, 'v2', '2 400+'), 12, 800, INK, 'end')) +
        chk(310, 40, 1.6, 12) + note(p(o, 'note', 'rasmli sharhlar va yomon sharhlarni o\'qing'), 2.2);
    },
    address: function (o) {
      return G('gm-in', 0, R(60, 30, 240, 140, 14, W, GREY) + T(76, 54, p(o, 'title', 'Yetkazish manzili'), 11, 700, MUTED)) +
        row(76, 64, 208, p(o, 'k1', 'Qabul qiluvchi'), p(o, 'v1', P.id), .5) +
        row(76, 96, 208, p(o, 'k2', 'Telefon'), p(o, 'v2', 'ombor raqami'), .9) +
        row(76, 128, 208, p(o, 'k3', 'Manzil'), p(o, 'v3', 'ombor + ID'), 1.3, AMB) +
        chk(300, 30, 1.9, 12) + note(p(o, 'note', 'nusxalang, qo\'lda yozmang'), 2.4);
    },
    addressDirect: function (o) {
      return G('gm-in', 0, R(60, 36, 240, 128, 14, W, GREY) + T(76, 62, 'Yetkazish manzili', 11, 700, MUTED)) +
        G('gm-in', .5, R(76, 74, 208, 30, 8, SOFT) + T(88, 94, 'Mamlakat', 12, 700, INK) + T(272, 94, "O'zbekiston", 12, 800, PRI, 'end')) +
        G('gm-in', 1.0, R(76, 112, 208, 30, 8, SOFT) + R(88, 123, 120, 8, 4, MUTED2)) + chk(284, 150, 1.8) +
        note(p(o, 'note', 'kuryer ham, ID ham shart emas'), 2.3);
    },
    pay: function (o) {
      var items = (o && o.items) || P.pay, s = '', ok = (o && o.ok !== undefined) ? o.ok : 0;
      for (var i = 0; i < Math.min(3, items.length); i++) {
        var y = 44 + i * 44, good = i === ok;
        s += G('gm-in', .3 + i * .4, R(60, y, 240, 36, 10, good ? LIGHT : W, good ? null : GREY) + T(76, y + 23, esc(items[i]), 12, 700, good ? PRI : MUTED)) + (good ? chk(300, y + 18, 1.8, 11) : '');
      }
      return s + note(p(o, 'note', 'ishonchlilik bo\'yicha tartib'), 2.4);
    },
    payFail: function (o) {
      return G('gm-in', 0, R(40, 60, 130, 80, 14, W, GREY) + R(56, 78, 40, 26, 6, PRI) + R(56, 114, 70, 8, 4, GREY) + T(140, 96, p(o, 'card', 'Visa'), 11, 800, INK)) + warn(170, 60, .8) +
        arrowR(180, 100, 1.2) +
        G('gm-pop', 1.7, R(214, 60, 106, 80, 14, LIGHT, PRI) + T(267, 92, p(o, 'alt', 'Vositachi'), 12, 800, PRI, 'middle') + T(267, 112, p(o, 'sub', 'so\'mda to\'laysiz'), 10, 700, MUTED, 'middle')) +
        note(p(o, 'note', 'karta rad etilsa — muqobil yo\'l'), 2.4);
    },
    track: function (o) {
      return phone(40, 110, 150) + header(40, 110, P.store, .3) +
        G('gm-pop', .8, R(56, 70, 78, 24, 8, AMBB, AMB) + T(95, 86, p(o, 'no', 'SF1234…'), 10, 800, AMB, 'middle')) +
        arrowR(160, 100, 1.4) +
        G('gm-in', 1.8, R(196, 40, 124, 120, 14, W, GREY) + T(258, 64, p(o, 'to', 'Kuryer kabineti'), 11, 700, PRI, 'middle') + row(206, 74, 104, 'Trek', '', 2.0) + G('gm-in', 2.3, R(206, 108, 104, 26, 8, AMBB) + T(258, 125, p(o, 'val', P.ex.price), 10, 800, AMB, 'middle'))) +
        chk(320, 40, 2.7, 12);
    },
    invoice: function (o) {
      return G('gm-in', 0, R(100, 18, 160, 140, 12, W, GREY) + lines(116, 36, [80, 60, 90]) + '<line x1="116" y1="92" x2="244" y2="92" stroke="' + GREY + '" stroke-width="2" stroke-dasharray="4 4"></line>' + T(116, 118, 'Jami', 11, 600, MUTED) + T(244, 118, p(o, 'sum', P.ex.price), 14, 800, INK, 'end')) +
        G('gm-pop', 1.2, '<circle cx="236" cy="112" r="22" fill="none" stroke="' + PRI + '" stroke-width="3"></circle><path d="M252 128l16 16" stroke="' + PRI + '" stroke-width="4" stroke-linecap="round"></path>') +
        note(p(o, 'note', 'buyurtma skrinshoti yoki invoys — bojxona uchun'), 2.2);
    },
    warehouse: function (o) {
      var s = '', n = 3;
      for (var i = 0; i < n; i++) s += parcel(56 + i * 96, 30, 56, 44, 'gm-pop', i * .4, i === 1 ? LIGHT : AMBB, i === 1 ? PRI : AMB) + arrowD(84 + i * 96, 84, 1.4);
      return s + parcel(120, 118, 120, 60, 'gm-pop', 1.9) + T(180, 152, p(o, 'label', 'bitta quti'), 11, 800, AMB, 'middle', 'gm-in', 2.3) + note(p(o, 'note', 'konsolidatsiya: bir marta to\'laysiz'), 2.6);
    },
    repack: function (o) {
      return parcel(40, 50, 120, 100, 'gm-in', 0, SOFT, MUTED2) + T(100, 40, p(o, 'big', 'zavod qutisi'), 11, 700, MUTED, 'middle', 'gm-in', .2) +
        arrowR(172, 100, .8) + parcel(216, 74, 76, 56, 'gm-pop', 1.3) + T(254, 62, p(o, 'small', 'qayta qadoq'), 11, 700, AMB, 'middle', 'gm-in', 1.5) +
        G('gm-pop', 2.0, R(206, 140, 96, 24, 8, GRNB) + T(254, 156, p(o, 'gain', 'hajm −30%'), 11, 800, GRN, 'middle')) + note(p(o, 'note', 'hajmiy og\'irlik kamayadi — arzonroq'), 2.5);
    },
    photo: function (o) {
      return parcel(60, 60, 90, 76, 'gm-in', 0) + G('gm-pop', .7, '<rect x="176" y="62" width="120" height="84" rx="12" fill="' + W + '" stroke="' + GREY + '" stroke-width="2"></rect><circle cx="236" cy="104" r="20" fill="none" stroke="' + PRI + '" stroke-width="3"></circle><circle cx="236" cy="104" r="8" fill="' + PRI + '"></circle>') +
        chk(296, 62, 1.5, 12) + note(p(o, 'note', 'foto-hisobot: tovar ochib suratga olinadi'), 2.2);
    },
    fly: function (o) {
      var days = p(o, 'days', P.days);
      return G('gm-in', 0, R(30, 80, 90, 40, 12, SOFT) + T(75, 105, p(o, 'from', P.from), 12, 700, '#4E4F6B', 'middle')) +
        G('gm-in', .3, R(240, 80, 90, 40, 12, LIGHT) + T(285, 105, "O'zbekiston", 12, 800, PRI, 'middle')) +
        '<line x1="126" y1="100" x2="234" y2="100" stroke="#DCDDFA" stroke-width="2" stroke-dasharray="4 5"></line>' + plane() +
        (days ? G('gm-pop', 2.4, R(130, 136, 100, 26, 13, W, GREY) + T(180, 153, days, 11, 700, INK, 'middle')) : '');
    },
    modes: function (o) {
      return G('gm-in', 0, R(40, 40, 128, 120, 14, LIGHT) + '<path d="M70 96l30-12-5 12 5 12-30-12z" fill="' + PRI + '"></path>' + T(104, 74, 'Avia', 13, 800, PRI, 'middle') + T(104, 128, p(o, 'air', '$' + P.air + '/kg'), 12, 800, INK, 'middle') + T(104, 146, p(o, 'airD', '8+ kun'), 10, 700, MUTED, 'middle')) +
        G('gm-in', .6, R(192, 40, 128, 120, 14, SOFT) + R(228, 84, 44, 22, 5, MUTED) + R(272, 90, 16, 16, 4, MUTED2) + '<circle cx="238" cy="110" r="5" fill="' + INK + '"></circle><circle cx="276" cy="110" r="5" fill="' + INK + '"></circle>' + T(256, 74, 'Avto', 13, 800, MUTED, 'middle') + T(256, 128, p(o, 'road', P.road ? '$' + P.road + '/kg' : '—'), 12, 800, INK, 'middle') + T(256, 146, p(o, 'roadD', '17+ kun'), 10, 700, MUTED, 'middle')) +
        note(p(o, 'note', 'tez yoki arzon — o\'zingiz tanlaysiz'), 2.2);
    },
    weight: function (o) {
      return G('gm-in', 0, R(40, 50, 120, 110, 14, W, GREY) + T(100, 76, 'Haqiqiy', 11, 700, MUTED, 'middle') + T(100, 110, p(o, 'real', '1,2 kg'), 18, 800, INK, 'middle') + T(100, 140, 'tarozida', 10, 600, MUTED, 'middle')) +
        G('gm-in', .6, R(200, 50, 120, 110, 14, W, GREY) + T(260, 76, 'Hajmiy', 11, 700, MUTED, 'middle') + T(260, 110, p(o, 'vol', '2,5 kg'), 18, 800, RED, 'middle') + T(260, 140, p(o, 'f', 'U×K×B / 6000'), 10, 600, MUTED, 'middle')) +
        chk(320, 50, 1.4, 12) + note(p(o, 'note', 'kattasi hisobga olinadi'), 2.0);
    },
    compare: function (o) {
      var items = (o && o.items) || [], s = '', best = (o && o.best) || 0;
      if (!items.length) items = [['Kuryer A', '$10/kg'], ['Kuryer B', '$6/kg'], ['Kuryer C', '$11/kg']];
      for (var i = 0; i < Math.min(3, items.length); i++) {
        var y = 40 + i * 42, on = i === best;
        s += G('gm-in', .3 + i * .4, R(40, y, 280, 34, 10, on ? LIGHT : W, on ? null : GREY) + T(56, y + 22, esc(items[i][0]), 12, 700, on ? PRI : INK) + T(304, y + 22, esc(items[i][1]), 12, 800, on ? PRI : MUTED, 'end'));
      }
      return s + note(p(o, 'note', 'narx, muddat, filial va konsolidatsiya'), 2.2);
    },
    stages: function (o) {
      var st = (o && o.items) || ['Omborda', 'Yo\'lda', 'Bojxonada', 'Filialda'], s = '';
      for (var i = 0; i < st.length; i++) {
        var x = 60 + i * 80;
        s += G('gm-pop', .3 + i * .5, '<circle cx="' + x + '" cy="80" r="14" fill="' + (i === st.length - 1 ? GRN : PRI) + '"></circle>' + T(x, 85, i + 1, 12, 800, W, 'middle') + T(x, 118, esc(st[i]), 10, 700, MUTED, 'middle'));
        if (i < st.length - 1) s += '<line class="gm-in"' + dl(.5 + i * .5) + ' x1="' + (x + 16) + '" y1="80" x2="' + (x + 64) + '" y2="80" stroke="' + GREY + '" stroke-width="3"></line>';
      }
      return s + note(p(o, 'note', 'kuryer ilovasida holat ko\'rinadi'), 2.6, 160);
    },
    postVsCourier: function (o) {
      var on = P.chan;
      return G(on === 'courier' ? 'gm-pop' : 'gm-in', 0, R(40, 46, 128, 100, 14, on === 'courier' ? PRI : SOFT) + T(104, 78, 'Kuryerlik', 12, 700, on === 'courier' ? '#DCDDFA' : MUTED, 'middle') + T(104, 112, '$200', 22, 800, on === 'courier' ? W : INK, 'middle') + T(104, 132, 'oyiga', 10, 700, on === 'courier' ? '#DCDDFA' : MUTED, 'middle')) +
        G(on === 'post' ? 'gm-pop' : 'gm-in', .6, R(192, 46, 128, 100, 14, on === 'post' ? PRI : SOFT) + T(256, 78, 'Pochta', 12, 700, on === 'post' ? '#DCDDFA' : MUTED, 'middle') + T(256, 112, '$100', 22, 800, on === 'post' ? W : INK, 'middle') + T(256, 132, 'oyiga', 10, 700, on === 'post' ? '#DCDDFA' : MUTED, 'middle')) +
        note(p(o, 'note', 'kanal boshqacha — me\'yor alohida'), 2.0, 176);
    },
    month: function () {
      var s = G('gm-in', 0, R(40, 26, 280, 150, 16, W, GREY) + R(40, 26, 280, 34, 16, PRI) + R(40, 44, 280, 16, 0, PRI) + T(180, 49, 'Kalendar oy', 13, 700, W, 'middle')), g = '';
      for (var r = 0; r < 4; r++) for (var c = 0; c < 7; c++) if (r < 3 || c < 4) g += R(58 + c * 38, 74 + r * 24, c === 6 ? 16 : 30, 16, 5, GREY);
      return s + '<g>' + g + '</g>' +
        G('gm-pop', .5, R(134, 70, 30, 24, 7, LIGHT, PRI) + T(149, 87, '$50', 10, 800, PRI, 'middle')) +
        G('gm-pop', 1.3, R(210, 94, 30, 24, 7, LIGHT, PRI) + T(225, 111, '$70', 10, 800, PRI, 'middle')) +
        G('gm-pop', 2.1, R(96, 142, 30, 24, 7, LIGHT, PRI) + T(111, 159, '$60', 10, 800, PRI, 'middle'));
    },
    customs: function (o) {
      var free = p(o, 'free', P.free), val = p(o, 'val', P.val);
      return T(40, 62, 'Bojxona · oylik me\'yor', 12, 700, MUTED, null, 'gm-in') + T(320, 62, free, 12, 800, INK, 'end', 'gm-in') + meter(76, 210, 0, .5) +
        G('gm-pop', 1.6, T(145, 132, val + ' — boj yo\'q', 15, 800, GRN, 'middle')) + chk(256, 127, 2) + note(p(o, 'note', 'ortiqchasiga 30% boj + yig\'im'), 2.6, 170);
    },
    customsOver: function (o) {
      var total = p(o, 'total', '$260'), over = p(o, 'over', '+$60'), duty = p(o, 'duty', '≈ $18 boj');
      return T(40, 62, 'Bojxona · oylik me\'yor', 12, 700, MUTED, null, 'gm-in') + T(300, 62, p(o, 'free', P.free), 12, 800, INK, 'end', 'gm-in') + meter(76, 240, 60, .5, 1.3) +
        T(120, 130, total, 15, 800, INK, 'middle', 'gm-pop', 1.8) + G('gm-pop', 2.2, R(240, 112, 70, 26, 8, REDB) + T(275, 130, over, 12, 800, RED, 'middle')) +
        G('gm-pop', 2.7, R(110, 150, 140, 30, 10, LIGHT) + T(180, 170, duty, 12, 800, PRI, 'middle'));
    },
    lanes: function (o) {
      var s = '', L = [['Yashil', GRNB, GRN], ['Sariq', AMBB, AMB], ['Qizil', REDB, RED]];
      for (var i = 0; i < 3; i++) s += G('gm-in', .3 + i * .3, R(40 + i * 100, 70, 80, 40, 12, L[i][1]) + T(80 + i * 100, 95, L[i][0], 13, 700, L[i][2], 'middle'));
      return s + parcel(160, 18, 40, 34, 'gm-pop', 1.4) + G('gm-in', 1.8, '<path d="M180 58v6" stroke="' + MUTED2 + '" stroke-width="2" stroke-dasharray="3 3"></path>') + note(p(o, 'note', 'hujjat to\'g\'ri, xavf past — yashil'), 2.4, 150);
    },
    notify: function (o) {
      return phone() + G('gm-pop', .9, R(130, 44, 100, 42, 10, LIGHT) + '<circle cx="143" cy="58" r="6" fill="' + PRI + '"></circle>' + R(153, 54, 30, 4, 2, PRI) + R(153, 62, 22, 4, 2, MUTED2) + R(136, 74, 48, 4, 2, MUTED2)) +
        '<circle class="gm-ring"' + dl(.9) + ' cx="180" cy="65" r="30" fill="none" stroke="' + PRI + '" stroke-width="2"></circle>' +
        G('gm-in', 1.6, R(134, 104, 92, 24, 8, P.color) + T(180, 120, 'Tasdiqlash', 10, 700, W, 'middle')) + G('gm-in', 1.9, R(134, 136, 92, 24, 8, SOFT) + T(180, 152, 'Rad etish', 10, 700, MUTED, 'middle')) +
        chip(20, 76, 88, 'my.gov.uz', W, PRI, 'gm-in', 2.2, 10) + chip(252, 76, 92, p(o, 'r', 'kuryer ilovasi'), W, PRI, 'gm-in', 2.5, 10);
    },
    receive: function (o) {
      return parcel(120, 60, 80, 66, 'gm-out', 0) + chk(236, 66, 2) +
        G('gm-pop', 2.5, R(100, 146, 160, 28, 14, W, GREY) + T(180, 164, p(o, 'trek', 'Trek: LP123456789' + (P.flow === 'direct' ? 'CN' : 'UZ')), 11, 700, PRI, 'middle'));
    },
    unbox: function (o) {
      return parcel(50, 60, 100, 80, 'gm-in', 0) + G('gm-pop', .7, R(170, 70, 60, 40, 8, INK) + '<circle cx="200" cy="90" r="9" fill="none" stroke="' + W + '" stroke-width="2.5"></circle><circle cx="200" cy="90" r="3" fill="' + RED + '"></circle>') +
        T(200, 128, 'video', 10, 700, MUTED, 'middle', 'gm-in', 1.0) + chk(276, 70, 1.6) + T(276, 118, p(o, 'ok', 'tekshirildi'), 10, 700, GRN, 'middle', 'gm-in', 1.9) +
        note(p(o, 'note', 'filialda pasport bilan, qutini joyida oching'), 2.4);
    },
    ret: function (o) {
      return parcel(50, 60, 90, 76, 'gm-in', 0) + G('gm-in', .6, '<path d="M150 98h60" stroke="' + MUTED2 + '" stroke-width="2.2" stroke-linecap="round"></path><path d="M204 92l7 6-7 6" fill="none" stroke="' + MUTED2 + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>') +
        G('gm-in', 1.0, R(222, 62, 98, 72, 14, W, GREY) + T(271, 90, p(o, 'to', P.from), 12, 700, INK, 'middle') + T(271, 112, p(o, 'days', '30 kun'), 12, 800, PRI, 'middle')) +
        (o && o.bad ? warn(320, 62, 1.6) : chk(320, 62, 1.6, 12)) + note(p(o, 'note', 'O\'zbekistondan qaytarish amalda imkonsiz'), 2.2);
    },
    size: function (o) {
      var shoe = (o && o.kind || P.sizeKind) === 'shoe';
      return G('gm-in', 0, R(40, 50, 140, 110, 14, W, GREY) + (shoe
        ? '<path d="M70 130c0-30 10-50 30-50 12 0 16 10 28 14 16 6 40 6 40 22 0 10-10 14-24 14H70z" fill="' + SOFT + '" stroke="' + MUTED2 + '" stroke-width="2"></path><line x1="70" y1="145" x2="168" y2="145" stroke="' + PRI + '" stroke-width="2"></line>' + T(119, 100, p(o, 'v', '26,5 sm'), 12, 800, PRI, 'middle')
        : '<path d="M110 66l-24 10-10 30 14 4v40h40v-40l14-4-10-30z" fill="' + SOFT + '" stroke="' + MUTED2 + '" stroke-width="2"></path><line x1="86" y1="118" x2="134" y2="118" stroke="' + PRI + '" stroke-width="2"></line>' + T(110, 146, p(o, 'v', 'ko\'krak 96 sm'), 10, 800, PRI, 'middle'))) +
        arrowR(190, 104, .8) +
        G('gm-pop', 1.3, R(224, 50, 96, 110, 14, LIGHT) + T(272, 76, 'Size Guide', 11, 700, PRI, 'middle') + row(232, 86, 80, 'M', p(o, 't1', '92–96'), 1.5) + row(232, 116, 80, 'L', p(o, 't2', '97–101'), 1.8)) + chk(320, 50, 2.2, 12) +
        note(p(o, 'note', 'santimetr bilan, harf bilan emas'), 2.6);
    },
    reviews: function (o) {
      return G('gm-in', 0, R(40, 40, 280, 44, 12, W, GREY) + T(56, 66, p(o, 'r1', '«kichik keladi» — kattaroq oldim'), 11, 700, INK)) +
        G('gm-in', .6, R(40, 94, 280, 44, 12, W, GREY) + T(56, 120, p(o, 'r2', '«o\'lchamga mos» · rasmli sharh'), 11, 700, INK)) +
        G('gm-pop', 1.3, R(40, 148, 100, 24, 8, GRNB) + T(90, 164, p(o, 'tag', 'rasmli 120'), 11, 800, GRN, 'middle')) + chk(320, 40, 1.6, 12) +
        note(p(o, 'note', 'matnli maqtovni sotib olish oson, rasmni yo\'q'), 2.2);
    },
    group: function (o) {
      return G('gm-in', 0, R(40, 50, 120, 100, 14, SOFT) + T(100, 82, p(o, 'solo', 'Yolg\'iz'), 11, 700, MUTED, 'middle') + T(100, 118, p(o, 'p1', '¥39'), 22, 800, MUTED, 'middle')) +
        G('gm-pop', .7, R(200, 50, 120, 100, 14, LIGHT, PRI) + T(260, 82, p(o, 'grp', 'Guruh 拼单'), 11, 700, PRI, 'middle') + T(260, 118, p(o, 'p2', '¥29'), 22, 800, PRI, 'middle')) +
        G('gm-pop', 1.4, '<circle cx="232" cy="140" r="8" fill="' + PRI + '"></circle><circle cx="250" cy="140" r="8" fill="#494FE9"></circle><circle cx="268" cy="140" r="8" fill="#7C80F0"></circle>') + chk(320, 50, 1.8, 12) +
        note(p(o, 'note', 'guruh bir necha soniyada o\'zi to\'ladi'), 2.4);
    },
    sku: function (o) {
      return G('gm-in', 0, R(40, 40, 280, 36, 12, W, GREY) + T(56, 63, p(o, 'sku', 'DD1391-100'), 13, 800, INK)) + chk(300, 58, .8, 11) +
        G('gm-in', 1.2, R(40, 90, 280, 70, 12, SOFT) + R(52, 100, 60, 50, 8, GREY) + T(124, 118, p(o, 'name', 'Nike Dunk Low'), 12, 800, INK) + T(124, 138, p(o, 'sub', 'aynan shu model, chalkashlik yo\'q'), 10, 600, MUTED)) +
        note(p(o, 'note', 'artikul bo\'yicha qidiruv eng aniq'), 2.2);
    },
    pricegrid: function (o) {
      var sizes = (o && o.items) || [['40', '¥899'], ['41', '¥859'], ['42', '¥869'], ['43', '¥999']], s = '';
      for (var i = 0; i < 4; i++) s += G('gm-in', .3 + i * .3, R(40 + i * 70, 60, 62, 70, 12, i === 1 ? LIGHT : W, i === 1 ? null : GREY) + T(71 + i * 70, 86, esc(sizes[i][0]), 13, 800, i === 1 ? PRI : INK, 'middle') + T(71 + i * 70, 112, esc(sizes[i][1]), 11, 700, i === 1 ? PRI : MUTED, 'middle'));
      return s + chk(102, 60, 1.6, 11) + note(p(o, 'note', 'har o\'lcham — o\'z narxi'), 2.2, 164);
    },
    auth: function (o) {
      return G('gm-in', 0, R(30, 76, 70, 50, 12, SOFT) + T(65, 106, 'Sotuvchi', 10, 700, MUTED, 'middle')) + arrowR(104, 100, .5) +
        G('gm-pop', .9, R(132, 50, 96, 100, 14, LIGHT, PRI) + T(180, 80, 'Tekshiruv', 11, 700, PRI, 'middle') + '<circle cx="180" cy="108" r="16" fill="none" stroke="' + PRI + '" stroke-width="3"></circle><path d="M192 120l10 10" stroke="' + PRI + '" stroke-width="3.5" stroke-linecap="round"></path>') +
        arrowR(232, 100, 1.5) + parcel(262, 76, 64, 50, 'gm-pop', 1.9) + G('gm-pop', 2.3, R(272, 60, 44, 16, 8, GRNB) + T(294, 72, p(o, 'seal', 'plomba'), 9, 800, GRN, 'middle')) +
        note(p(o, 'note', 'avval tekshir, keyin jo\'nat'), 2.6);
    },
    auction: function (o) {
      var bids = (o && o.items) || ['$40', '$46', '$52'], s = '';
      for (var i = 0; i < 3; i++) s += G('gm-pop', .4 + i * .6, R(40 + i * 96, 60, 88, 40, 12, i === 2 ? LIGHT : W, i === 2 ? null : GREY) + T(84 + i * 96, 86, esc(bids[i]), 14, 800, i === 2 ? PRI : MUTED, 'middle'));
      return s + G('gm-in', 2.2, R(120, 118, 120, 30, 10, AMBB) + T(180, 138, p(o, 'max', 'maksimal: $55'), 11, 800, AMB, 'middle')) + note(p(o, 'note', 'tizim sizning o\'rningizga qadam-baqadam ko\'taradi'), 2.6, 176);
    },
    listing: function (o) {
      var items = (o && o.items) || [['New', GRN], ['Refurbished', AMB], ['Used', MUTED], ['For parts', RED]], s = '';
      for (var i = 0; i < 4; i++) s += G('gm-in', .3 + i * .3, R(40, 40 + i * 34, 280, 26, 8, i === 0 ? GRNB : W, i === 0 ? null : GREY) + T(56, 57 + i * 34, esc(items[i][0]), 11, 700, items[i][1]));
      return s + chk(320, 40, 1.8, 11) + note(p(o, 'note', 'Condition — eng muhim maydon'), 2.4, 190);
    },
    pricehist: function (o) {
      return G('gm-in', 0, R(40, 40, 280, 120, 14, W, GREY)) + G('gm-in', .5, '<polyline points="56,120 90,100 120,110 150,84 180,96 210,70 240,90 270,64 300,80" fill="none" stroke="' + PRI + '" stroke-width="2.5" stroke-linejoin="round"></polyline>') +
        G('gm-pop', 1.4, '<circle cx="270" cy="64" r="6" fill="' + GRN + '"></circle>' + T(270, 54, p(o, 'min', 'minimum'), 10, 800, GRN, 'middle')) +
        G('gm-pop', 1.9, R(230, 120, 80, 24, 8, REDB) + T(270, 136, p(o, 'now', 'hozir +18%'), 10, 800, RED, 'middle')) + note(p(o, 'note', 'Keepa / camelcamelcamel — narx tarixi'), 2.4);
    },
    cart: function (o) {
      return G('gm-in', 0, R(60, 30, 240, 140, 14, W, GREY) + T(76, 54, p(o, 'title', 'Savat'), 11, 700, MUTED)) +
        row(76, 64, 208, p(o, 'k1', 'Tovar'), p(o, 'v1', '$45'), .4) + row(76, 96, 208, p(o, 'k2', 'Kupon'), p(o, 'v2', '−$5'), .8, GRN) + row(76, 128, 208, p(o, 'k3', 'Yetkazish'), p(o, 'v3', 'bepul'), 1.2, GRN) +
        chk(300, 30, 1.7, 12) + note(p(o, 'note', 'manzil, tezlik va jami summani tekshiring'), 2.3);
    },
    mbg: function (o) {
      return G('gm-in', 0, '<path d="M180 30l60 22v40c0 40-26 68-60 84-34-16-60-44-60-84V52z" fill="' + LIGHT + '" stroke="' + PRI + '" stroke-width="2.5" stroke-linejoin="round"></path>') +
        G('gm-pop', .8, '<path d="M158 104l14 14 30-32" fill="none" stroke="' + PRI + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>') +
        chip(20, 76, 92, p(o, 'l', '30 kun'), W, PRI, 'gm-in', 1.4, 11) + chip(248, 76, 96, p(o, 'r', 'eBay orqali'), W, PRI, 'gm-in', 1.8, 11) + note(p(o, 'note', 'Money Back Guarantee — muddat ichida oching'), 2.4);
    },
    tax: function (o) {
      return G('gm-in', 0, R(40, 50, 128, 110, 14, SOFT) + T(104, 80, p(o, 'l', 'Nyu-York'), 11, 700, MUTED, 'middle') + T(104, 116, p(o, 'lv', '+8,9%'), 22, 800, RED, 'middle') + T(104, 142, 'sales tax', 10, 700, MUTED, 'middle')) +
        G('gm-pop', .7, R(192, 50, 128, 110, 14, LIGHT, PRI) + T(256, 80, p(o, 'r', 'Delaware'), 11, 700, PRI, 'middle') + T(256, 116, p(o, 'rv', '0%'), 22, 800, PRI, 'middle') + T(256, 142, 'sales tax', 10, 700, MUTED, 'middle')) + chk(320, 50, 1.4, 12) +
        note(p(o, 'note', 'soliqsiz shtat manzili — arzonroq'), 2.0, 184);
    },
    kdv: function (o) {
      return G('gm-in', 0, R(60, 40, 240, 120, 14, W, GREY) + T(76, 66, p(o, 'title', 'Narx tarkibi'), 11, 700, MUTED)) +
        row(76, 78, 208, p(o, 'k1', 'Tovar'), p(o, 'v1', '₺1 200'), .5) + row(76, 108, 208, p(o, 'k2', 'KDV (soliq)'), p(o, 'v2', 'narxga kirgan'), .9, AMB) +
        chk(300, 40, 1.5, 12) + note(p(o, 'note', 'chet elga chiqarilganda ba\'zan qaytariladi'), 2.2);
    },
    chat: function (o) {
      return G('gm-in', 0, R(40, 40, 200, 44, 14, SOFT) + T(56, 66, p(o, 'q', 'Havola + o\'lcham yubordim'), 11, 700, INK)) +
        G('gm-in', .8, R(120, 96, 200, 44, 14, LIGHT) + T(136, 122, p(o, 'a', 'Sotib oldim, 5% komissiya'), 11, 700, PRI)) + chk(320, 96, 1.4, 12) +
        note(p(o, 'note', 'vositachi — Telegramdagi xizmat'), 2.0);
    },
    seal: function (o) {
      return parcel(60, 50, 110, 90, 'gm-in', 0) + G('gm-pop', .6, R(100, 40, 60, 20, 10, GRNB) + T(130, 54, p(o, 'seal', '鉴别扣'), 10, 800, GRN, 'middle')) +
        arrowR(180, 96, 1.0) + phone(214, 100, 130) + G('gm-pop', 1.6, R(228, 60, 72, 50, 8, LIGHT) + '<rect x="248" y="70" width="32" height="32" rx="4" fill="none" stroke="' + PRI + '" stroke-width="2.5"></rect><rect x="256" y="78" width="6" height="6" fill="' + PRI + '"></rect><rect x="270" y="78" width="6" height="6" fill="' + PRI + '"></rect><rect x="256" y="92" width="6" height="6" fill="' + PRI + '"></rect>') +
        chk(314, 100, 2.2, 12) + note(p(o, 'note', 'QR-kod ilovada buyurtmaga mos kelsin'), 2.6);
    }
  };

  /* ---------- standart ssenariylar ---------- */
  var ex = P.ex;
  var DEF = {
    'p-customs': function () {
      var post = P.chan === 'post';
      var st = [
        { t: 'Ikki kanal, ikki me\'yor', s: 'postVsCourier', c: post
          ? 'Bu qo\'llanmadagi asosiy yo\'l pochta orqali, shuning uchun bojsiz me\'yor oyiga $100. Kuryer (oraliq manzil) orqali olsangiz — $200. Kanal boshqacha bo\'lsa, hisob ham alohida yuritiladi.'
          : P.store + ' buyurtmasi kuryer orqali keladi — bojsiz me\'yor oyiga $200. Pochta (UzPost, EMS) kanalida esa $100. Ikki kanal alohida hisoblanadi.' },
        { t: 'Kalendar oy, hamma jo\'natma bitta hisobda', s: 'month', c: 'Oyning 1-sanasidan oxirigacha kelgan barcha jo\'natmalar qo\'shib boriladi — qaysi do\'kondan va qaysi kuryerdan kelgani muhim emas. Buyurtma sanasi emas, bojxonaga kelgan sana hisoblanadi.' },
        { t: 'Misol: ' + P.store + ' buyurtmasi', s: 'customs', p: { val: ex.price }, c: 'Aytaylik, ' + ex.price + ' lik buyurtma, vazni ' + ex.kg + '. Shu oyda boshqa jo\'natma bo\'lmasa, hisob me\'yor ichida — boj ham, yig\'im ham yo\'q, jo\'natma to\'g\'ridan-to\'g\'ri chiqariladi.' },
        { t: 'Me\'yordan oshsa', s: 'customsOver', p: { free: post ? '$100' : '$200', total: post ? '$160' : '$260', over: '+$60', duty: '≈ $18 boj' }, c: 'Boj butun summadan emas, faqat ortiqcha qismdan: 30%, lekin har ortiqcha kilogramm uchun $3 dan kam emas. $60 ortiqcha bo\'lsa — taxminan $18 boj, ustiga bojxona yig\'imi (BHM ning 25% i).' },
        { t: 'Yetkazish ham qiymatga kiradi', s: 'invoice', p: { sum: ex.price + ' + $8', note: 'tovar + yetkazish ulushi' }, c: 'Bojxona qiymati — tovar narxi va xalqaro yetkazishning ortiqcha qismga to\'g\'ri keladigan ulushi. Shuning uchun kalkulyatorga yetkazish narxini ham kiriting: hisob real chiqadi.' },
        { t: 'Real qiymatni yozing', s: 'invoice', p: { sum: ex.price, note: 'buyurtma skrinshoti = dalil' }, c: 'Kuryer kabinetiga qiymatni kamaytirib yozmang. Bojxona narxni bozor bilan solishtiradi; farq katta bo\'lsa qiymat qayta baholanadi va jo\'natma ushlanadi. Buyurtma sahifasi skrinshotini saqlang.' },
        { t: 'Yashil, sariq, qizil yo\'laklar', s: 'lanes', c: 'Xavfni boshqarish tizimi har jo\'natmaga yo\'lak beradi. Yashil — hujjat to\'g\'ri, xavf past, tez chiqariladi. Sariq — hujjat yoki qiymat tekshiriladi. Qizil — ko\'rik. Real qiymat va aniq tovar nomi yashil yo\'lak ehtimolini oshiradi.' },
        { t: 'Xabarnoma va tasdiqlash', s: 'notify', c: 'Jo\'natma O\'zbekistonga kirgach my.gov.uz ga xabarnoma keladi (kuryer ilovasi ham ko\'rsatadi). Tovar nomi, qiymati va vaznini tekshirib «Tasdiqlash» ni bosasiz. Xato bo\'lsa — tasdiqlamang, kuryerga yozing.' },
        { t: 'To\'lov va chiqarish', s: 'receive', p: { trek: 'Boj + yig\'im — to\'landi' }, c: 'Me\'yor ichida bo\'lsa hech narsa to\'lanmaydi. Oshgan bo\'lsa boj va yig\'imni kuryer ilovasi, bank yoki bojxona to\'lov tizimi orqali to\'laysiz — to\'lov tasdiqlangach jo\'natma chiqariladi va filialga keladi.' }
      ];
      if (M.customsNote) st.splice(4, 0, M.customsNote);
      return { title: 'Bojxona: ' + P.store + ' uchun', steps: st, cta: { tab: 'p-calc', label: 'Kalkulyatorda hisoblash' } };
    },
    'p-cargo': function () {
      var items = P.cargo.slice(0, 3).map(function (c) { return [c[0], c[1]]; });
      var st = [
        { t: 'Kuryerni qanday tanlash', s: 'compare', p: { items: items }, c: 'Kilogramm narxi, minimal og\'irlik, muddat, Toshkentdagi filial va konsolidatsiya bepulligi — to\'rt mezon. ' + (P.flow === 'direct' ? 'To\'g\'ridan-to\'g\'ri yo\'lda kuryer shart emas, lekin tezroq kerak bo\'lsa oraliq manzil ishlaydi.' : 'Jadvalda shu qo\'llanmaga mos kuryerlar solishtirilgan.') },
        { t: 'Avia yoki avto', s: 'modes', p: { air: '$' + P.air + '/kg', road: P.road ? '$' + P.road + '/kg' : '—', airD: P.road ? '8+ kun' : P.days, roadD: P.road ? '17+ kun' : '—' }, c: P.road
          ? 'Avia — tez (taxminan $' + P.air + '/kg), avto — arzon (taxminan $' + P.road + '/kg), lekin ikki-uch barobar uzoq. Og\'ir va shoshilmaydigan yuk uchun avto, yengil va qimmat tovar uchun avia.'
          : P.from + ' yo\'nalishida asosan avia: taxminan $' + P.air + '/kg, ' + P.days + '. Kuryerlar tarifni ombor va og\'irlik oralig\'iga qarab belgilaydi.' },
        { t: 'Vazn qanday hisoblanadi', s: 'weight', c: 'Kuryer ikki vaznni solishtiradi: tarozidagi haqiqiy vazn va hajmiy vazn (uzunlik × kenglik × balandlik / 6000). Qaysi biri katta bo\'lsa, o\'sha to\'lanadi. Katta quti ichidagi yengil tovar shuning uchun qimmat chiqadi.' },
        { t: 'Konsolidatsiya', s: 'warehouse', c: 'Bir nechta buyurtma omborga alohida keladi. Ularni bitta qutiga jamlasangiz minimal og\'irlik uchun bir marta to\'laysiz — bu eng katta tejash manbai. Hamma buyurtma yetib kelguncha kuting, keyin jo\'natishni tasdiqlang.' },
        { t: 'Qadoqni yengillashtirish', s: 'repack', c: 'Zavod qutilari hajmni oshiradi. «Qutini olib tashlash» yoki qayta qadoqlash xizmati hajmiy og\'irlikni sezilarli kamaytiradi. Faqat quti kafolat yoki qayta sotish uchun kerak bo\'lsa qoldiring.' },
        { t: 'Foto-hisobot va sug\'urta', s: 'photo', c: 'Qo\'shimcha $1–3 evaziga omborda tovarni ochib suratga olib berishadi. Qimmat yoki o\'lchami muhim tovarda albatta oling: muammo ' + P.from + 'dan chiqmasdan turib ko\'rinadi. Sug\'urta — qiymatning bir necha foizi.' },
        { t: 'Trek raqami va bosqichlar', s: 'stages', c: 'Kuryer ilovasida jo\'natma holati ko\'rinadi: omborga qabul qilindi → tortildi → chiqdi → yo\'lda → O\'zbekiston bojxonasida → filialda. Muddat ombordan chiqqan kundan sanaladi.' },
        { t: 'Filialda qabul qilish', s: 'unbox', c: 'Pasport bilan boring, qutini joyida oching va ochish jarayonini videoga oling — ko\'p kuryer «ketgandan keyin da\'vo qabul qilinmaydi» qoidasini qo\'llaydi. Muammo bo\'lsa video yagona ishonchli dalil.' }
      ];
      if (M.cargoNote) st.splice(2, 0, M.cargoNote);
      return { title: 'Yetkazish qanday ishlaydi', steps: st, cta: { tab: 'p-calc', label: 'Yetkazishni hisoblash' } };
    },
    'p-size': function () {
      var shoe = P.sizeKind === 'shoe';
      var st = [
        { t: 'Nega o\'lcham eng muhim qadam', s: 'ret', p: { bad: true, to: P.from, days: 'qaytarish yo\'q' }, c: 'Qaytarilgan buyurtmalarning aksariyati o\'lcham sababli. O\'zbekistondan qaytarish esa amalda imkonsiz — pochta narxi tovar narxidan qimmat. Shuning uchun bu bosqichga 10 daqiqa sarflang.' },
        { t: 'O\'zingizni o\'lchang', s: 'size', c: shoe
          ? 'Qog\'ozni devorga tirab, tovonni tegizing va eng uzun barmoq uchini belgilang — bu oyoq uzunligi santimetrda. Kechqurun o\'lchang (oyoq biroz kattalashadi) va ikkala oyoqni ham o\'lchab, kattasini oling.'
          : 'Ko\'krak, bel, son aylanasini, yelka kengligi va qo\'l uzunligini santimetrda o\'lchang. Bir marta o\'lchab, telefoningizga yozib qo\'ying — keyin har buyurtmada shu raqamlar kerak bo\'ladi.' },
        { t: 'Size Guide bilan solishtiring', s: 'size', p: { note: 'harf emas, santimetr' }, c: 'Har tovar sahifasida o\'sha modelning o\'z jadvali bor. Harf (M, L) yoki raqam (42) emas, santimetr ustuniga qarang: bir xil «M» turli brendda 4–6 sm farq qiladi.' },
        { t: 'Brendlar farq qiladi', s: 'pricegrid', p: { items: shoe ? [['EU 42', 'Nike 26,5'], ['EU 42', 'Adidas 27'], ['EU 42', 'NB 26,5'], ['EU 42', 'Puma 27']] : [['M', 'Zara 96'], ['M', 'H&M 100'], ['M', 'Uniqlo 98'], ['M', 'Shein 94']], note: 'bir xil belgi — har xil o\'lcham' }, c: (shoe ? 'Nike, Adidas va New Balance bir xil EU 42 uchun har xil santimetr beradi. ' : 'Osiyo brendlari odatda Yevropadagidan bir o\'lcham kichik. ') + '«O\'lchamlar» bo\'limidagi jadval brendlar bo\'yicha solishtirib beradi.' },
        { t: 'Sharhlarni o\'qing', s: 'reviews', c: 'Rasmli sharhlarda xaridorlar o\'z bo\'yi-vazni bilan qaysi o\'lchamni olganini yozadi. «Kichik keladi» yoki «katta keladi» degan izohlar takrorlansa — shunga qarab bir o\'lcham o\'zgartiring.' },
        { t: 'Ikkilansangiz', s: 'chat', p: { q: 'Bo\'yim 175, vaznim 70 — qaysi o\'lcham?', a: 'L oling, model tor bichilgan' }, c: (shoe ? 'Krossovkada ikki o\'lcham orasida qolsangiz kattasini oling. ' : 'Ikki o\'lcham orasida qolsangiz kattasini oling — kichikni kattalashtirib bo\'lmaydi. ') + 'Sotuvchidan yoki vositachidan so\'rash ham bepul: bo\'y, vazn va odatdagi o\'lchamingizni yozing.' }
      ];
      return { title: 'O\'lchamni to\'g\'ri tanlash', steps: st, cta: { tab: 'p-check', label: 'Checklistni ochish' } };
    }
  };

  /* ---------- pleyer ---------- */
  var MIN_MS = 4500, MAX_MS = 8500;
  var ms = function (st) { return st.ms || Math.min(MAX_MS, Math.max(MIN_MS, 2500 + String(st.c).length * 45)); };
  var ICON = {
    play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#1A1FB0" style="margin-left:2px"><path d="M7 5.5v13a1 1 0 001.5.86l11-6.5a1 1 0 000-1.72l-11-6.5A1 1 0 007 5.5z"></path></svg>',
    pause: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#1A1FB0"><rect x="5" y="4" width="5" height="16" rx="1.5"></rect><rect x="14" y="4" width="5" height="16" rx="1.5"></rect></svg>',
    replay: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1FB0" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path></svg>',
    x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6C85" stroke-width="2.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
    chev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A6A7BC" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>',
    big: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" style="margin-left:2px"><path d="M7 5.5v13a1 1 0 001.5.86l11-6.5a1 1 0 000-1.72l-11-6.5A1 1 0 007 5.5z"></path></svg>'
  };
  var openTab = function (id) {
    var i = -1; (typeof TABS !== 'undefined' ? TABS : []).forEach(function (t, k) { if (t.id === id) i = k; });
    var b = i >= 0 ? document.querySelectorAll('.tab')[i] : null;
    if (b) { b.click(); window.scrollTo({ top: Math.max(0, b.getBoundingClientRect().top + window.scrollY - 8), behavior: 'smooth' }); }
  };
  var durLabel = function (steps) {
    var total = 0; steps.forEach(function (s) { total += ms(s); });
    return (total >= 60000 ? '≈ ' + String(Math.round(total / 30000) / 2).replace('.', ',') + ' daqiqa' : Math.round(total / 1000) + ' soniya') + ' · ' + steps.length + ' qadam';
  };

  function Player(panel, video) {
    var steps = video.steps, n = steps.length, step = 0, playing = false, open = false, timer = null, self = this;
    var card = document.createElement('div'); card.className = 'gm-card';
    panel.insertBefore(card, panel.firstChild);
    var clear = function () { clearTimeout(timer); };
    var tick = function () {
      clear();
      timer = setTimeout(function () {
        if (!playing) return;
        if (step >= n - 1) { playing = false; refresh(); return; }
        step++; render(); tick();
      }, ms(steps[step]));
    };
    var start = function () { clear(); open = true; step = 0; playing = true; render(); tick(); };
    var toggle = function () {
      if (playing) { clear(); playing = false; refresh(); return; }
      if (step >= n - 1) { step = 0; playing = true; render(); tick(); return; }
      playing = true; refresh(); tick();
    };
    var go = function (i) { clear(); step = i; playing = true; render(); tick(); };
    var stop = function () { clear(); open = false; step = 0; playing = false; render(); };
    this.stop = stop; this.panel = panel;

    function refresh() {
      var ended = !playing && step === n - 1;
      var b = card.querySelector('.gm-btn');
      if (b) { b.innerHTML = playing ? ICON.pause : (ended ? ICON.replay : ICON.play); b.setAttribute('aria-label', playing ? 'Pauza' : (ended ? 'Qayta ko\'rish' : 'Boshlash')); }
      var seg = card.querySelector('.gm-seg .cur i');
      if (seg) { seg.style.animationPlayState = playing ? 'running' : 'paused'; if (ended) { seg.style.animation = 'none'; seg.style.width = '100%'; } }
      var cta = card.querySelector('.gm-cta');
      if (cta) cta.hidden = !ended;
    }
    function render() {
      if (!open) {
        card.innerHTML = '<button type="button" class="gm-open" aria-label="' + esc(video.title) + ' — animatsiyani ko\'rish">' +
          '<span class="gm-play">' + ICON.big + '</span>' +
          '<span class="gm-txt"><b>' + esc(video.title) + '</b><span>' + durLabel(steps) + '</span></span>' + ICON.chev + '</button>';
        card.querySelector('.gm-open').onclick = start;
        return;
      }
      var s = steps[step], ended = !playing && step === n - 1;
      var fn = SC[s.s] || SC.brand;
      var segs = '';
      for (var i = 0; i < n; i++) {
        var cls = i < step ? 'done' : (i === step ? 'cur' : '');
        var fill = i < step ? 'width:100%' : (i === step ? (ended ? 'width:100%' : 'animation:gm-bar ' + ms(s) + 'ms linear both;animation-play-state:' + (playing ? 'running' : 'paused')) : 'width:0');
        segs += '<button type="button" class="gm-dot ' + cls + '" data-i="' + i + '" aria-label="' + (i + 1) + '-qadam"><span><i style="' + fill + '"></i></span></button>';
      }
      card.innerHTML = '<div class="gm-stage" aria-hidden="true"><svg viewBox="0 0 360 200" data-step="' + step + '">' + fn(s.p) + '</svg></div>' +
        '<div class="gm-body"><div role="status" aria-live="polite" class="gm-text"><div class="gm-title">' + esc(s.t) + '</div><div class="gm-cap">' + esc(s.c) + '</div></div>' +
        (video.cta ? '<button type="button" class="gm-cta"' + (ended ? '' : ' hidden') + '>' + esc(video.cta.label) + '</button>' : '') +
        '<div class="gm-ctl"><button type="button" class="gm-btn" aria-label="' + (playing ? 'Pauza' : (ended ? 'Qayta ko\'rish' : 'Boshlash')) + '">' + (playing ? ICON.pause : (ended ? ICON.replay : ICON.play)) + '</button>' +
        '<div class="gm-seg" role="group" aria-label="Qadamlar">' + segs + '</div>' +
        '<span class="gm-n">' + (step + 1) + ' / ' + n + '</span>' +
        '<button type="button" class="gm-x" aria-label="Yopish">' + ICON.x + '</button></div></div>';
      card.querySelector('.gm-btn').onclick = toggle;
      card.querySelector('.gm-x').onclick = stop;
      var cta = card.querySelector('.gm-cta');
      if (cta) cta.onclick = function () { stop(); if (video.cta.tab) openTab(video.cta.tab); };
      card.querySelectorAll('.gm-dot').forEach(function (d) { d.onclick = function () { go(+d.dataset.i); }; });
    }
    render();
    self.isOpen = function () { return open; };
  }

  /* ---------- videolarni panellarga joylash ---------- */
  var V = M.videos || {};
  var players = [];
  ['p-start', 'p-steps', 'p-customs', 'p-cargo', 'p-size', 'p-safety', 'p-auth'].forEach(function (id) {
    var panel = document.getElementById(id);
    if (!panel) return;
    var video = V[id] || (DEF[id] ? DEF[id]() : null);
    if (!video || !video.steps || !video.steps.length) return;
    players.push(new Player(panel, video));
  });
  /* Boshqa tabga o'tilganda ochiq video to'xtaydi. */
  var check = function () { players.forEach(function (pl) { if (pl.isOpen() && !pl.panel.classList.contains('active')) pl.stop(); }); };
  document.addEventListener('xy:panel', check);
  document.querySelectorAll('.tab').forEach(function (t) { t.addEventListener('click', function () { setTimeout(check, 0); }); });
})();
