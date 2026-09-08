/* Qo'llanmaning "Qanday ishlaydi" motion-tushuntirishi.
 *
 * Har qo'llanma o'z skriptida `MOTION` ni e'lon qiladi:
 *   { store, color, from, flow:'courier'|'direct', days, id, caps:[5 ta] }
 * Bu fayl birinchi panel (#p-start) tepasiga kartani qo'yadi; bosilganda
 * 5 sahnali SVG/CSS animatsiya o'ynaydi (har sahna GM_STEP_MS). Sahnalar
 * umumiy, faqat do'kon nomi, rangi, davlat va yo'l (kuryer / to'g'ridan)
 * o'zgaradi — shuning uchun yetti qo'llanma bitta koddan foydalanadi.
 * Video fayl yo'q, hammasi shu yerda; harakatni kamaytirish rejimida
 * sahnalar statik kadr (guide-common.css). Qo'llanmalar faqat o'zbekcha,
 * shuning uchun tarjima yo'q. */
(function () {
  if (typeof MOTION === 'undefined' || !MOTION || !MOTION.caps) return;
  var panel = document.querySelector('.panel');
  if (!panel) return;
  var GM_STEP_MS = 4000;
  var M = MOTION, n = M.caps.length, step = 0, playing = false, open = false, timer = null;
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  var store = esc(M.store), color = M.color || '#1A1FB0', from = esc(M.from || 'Xitoy'), days = esc(M.days || ''), pid = esc(M.id || 'UZ-48213');

  /* --- sahnalar (360x200) --- */
  var chk = function (x, y, d) { return '<g class="gm-pop" style="animation-delay:' + d + 's"><circle cx="' + x + '" cy="' + y + '" r="13" fill="#E9F8EF"></circle><path d="M' + (x - 6.5) + ' ' + y + 'l4.5 4.5 8.5-9" fill="none" stroke="#0F7B3E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path></g>'; };
  var scenes = [
    // 1. Buyurtma: telefon, do'kon sarlavhasi, tovar kartasi, tugma
    function () {
      return '<g class="gm-in"><rect x="120" y="14" width="120" height="176" rx="18" fill="#131429"></rect><rect x="128" y="26" width="104" height="152" rx="12" fill="#FFFFFF"></rect><rect x="166" y="20" width="28" height="4" rx="2" fill="#4E4F6B"></rect></g>' +
        '<g class="gm-in" style="animation-delay:.4s"><rect x="128" y="26" width="104" height="26" rx="12" fill="' + color + '"></rect><rect x="128" y="40" width="104" height="12" fill="' + color + '"></rect><text x="180" y="44" text-anchor="middle" font-size="11" font-weight="800" fill="#FFFFFF">' + store + '</text></g>' +
        '<g class="gm-pop" style="animation-delay:.9s"><rect x="140" y="64" width="80" height="56" rx="10" fill="#F1F1F8"></rect><rect x="150" y="72" width="60" height="26" rx="6" fill="#E3E4EE"></rect><rect x="150" y="104" width="40" height="6" rx="3" fill="#A6A7BC"></rect></g>' +
        '<g class="gm-pop" style="animation-delay:1.6s"><rect x="140" y="132" width="80" height="30" rx="10" fill="' + color + '"></rect><text x="180" y="151" text-anchor="middle" font-size="11" font-weight="700" fill="#FFFFFF">Buyurtma</text></g>' +
        '<circle class="gm-tap" style="animation-delay:2.2s" cx="180" cy="147" r="16" fill="rgba(26,31,176,.25)"></circle>' + chk(226, 132, 2.9);
    },
    // 2. Manzil: kuryer ombori + ID (yoki to'g'ridan checkout)
    function () {
      if (M.flow === 'direct') {
        return '<g class="gm-in"><rect x="60" y="36" width="240" height="128" rx="14" fill="#FFFFFF" stroke="#E3E4EE"></rect><text x="76" y="62" font-size="11" font-weight="700" fill="#6B6C85">Yetkazish manzili</text></g>' +
          '<g class="gm-in" style="animation-delay:.5s"><rect x="76" y="74" width="208" height="30" rx="8" fill="#F1F1F8"></rect><text x="88" y="94" font-size="12" font-weight="700" fill="#131429">Mamlakat</text><text x="272" y="94" text-anchor="end" font-size="12" font-weight="800" fill="#1A1FB0">O\'zbekiston</text></g>' +
          '<g class="gm-in" style="animation-delay:1s"><rect x="76" y="112" width="208" height="30" rx="8" fill="#F1F1F8"></rect><rect x="88" y="123" width="120" height="8" rx="4" fill="#A6A7BC"></rect></g>' +
          chk(284, 150, 1.8) +
          '<text class="gm-in" style="animation-delay:2.3s" x="180" y="186" text-anchor="middle" font-size="11" font-weight="600" fill="#6B6C85">kuryer ham, ID ham shart emas</text>';
      }
      return '<g class="gm-in"><rect x="44" y="52" width="130" height="100" rx="14" fill="#E9EAFD" stroke="#1A1FB0" stroke-width="2"></rect><rect x="94" y="110" width="30" height="42" rx="6" fill="#1A1FB0"></rect><rect x="58" y="68" width="22" height="16" rx="4" fill="#FFFFFF"></rect><rect x="88" y="68" width="22" height="16" rx="4" fill="#FFFFFF"></rect><rect x="118" y="68" width="22" height="16" rx="4" fill="#FFFFFF"></rect><text x="109" y="42" text-anchor="middle" font-size="12" font-weight="700" fill="#1A1FB0">Ombor · ' + from + '</text></g>' +
        '<g class="gm-in" style="animation-delay:.6s"><rect x="196" y="56" width="124" height="92" rx="12" fill="#FFFFFF" stroke="#E3E4EE"></rect><rect x="210" y="70" width="70" height="6" rx="3" fill="#E3E4EE"></rect><rect x="210" y="84" width="96" height="6" rx="3" fill="#E3E4EE"></rect><rect x="210" y="98" width="56" height="6" rx="3" fill="#E3E4EE"></rect></g>' +
        '<g class="gm-pop" style="animation-delay:1.4s"><rect x="206" y="112" width="104" height="24" rx="8" fill="#FDF3E3" stroke="#B45309" stroke-width="2"></rect><text x="258" y="129" text-anchor="middle" font-size="11" font-weight="800" fill="#B45309">ID ' + pid + '</text></g>' +
        '<text class="gm-in" style="animation-delay:2.2s" x="180" y="182" text-anchor="middle" font-size="11" font-weight="600" fill="#6B6C85">manzil + ID kod — buyurtmaga</text>';
    },
    // 3. Yo'lda: davlat -> samolyot -> UZ
    function () {
      return '<g class="gm-in"><rect x="30" y="80" width="90" height="40" rx="12" fill="#F1F1F8"></rect><text x="75" y="105" text-anchor="middle" font-size="12" font-weight="700" fill="#4E4F6B">' + from + '</text></g>' +
        '<g class="gm-in" style="animation-delay:.3s"><rect x="240" y="80" width="90" height="40" rx="12" fill="#E9EAFD"></rect><text x="285" y="105" text-anchor="middle" font-size="12" font-weight="800" fill="#1A1FB0">O\'zbekiston</text></g>' +
        '<line x1="126" y1="100" x2="234" y2="100" stroke="#DCDDFA" stroke-width="2" stroke-dasharray="4 5"></line>' +
        '<g class="gm-fly"><path d="M150 100l22-9-4 9 4 9-22-9z" fill="#1A1FB0"></path><rect x="150" y="97" width="16" height="6" rx="3" fill="#494FE9"></rect></g>' +
        (days ? '<g class="gm-pop" style="animation-delay:2.4s"><rect x="130" y="136" width="100" height="26" rx="13" fill="#FFFFFF" stroke="#E3E4EE"></rect><text x="180" y="153" text-anchor="middle" font-size="11" font-weight="700" fill="#131429">' + days + '</text></g>' : '');
    },
    // 4. Bojxona: me'yor chizig'i
    function () {
      var free = M.free || '$200', val = M.val || '$150';
      return '<text class="gm-in" x="40" y="62" font-size="12" font-weight="700" fill="#6B6C85">Bojxona · oylik me\'yor</text>' +
        '<text class="gm-in" x="320" y="62" text-anchor="end" font-size="12" font-weight="800" fill="#131429">' + esc(free) + '</text>' +
        '<rect x="40" y="76" width="280" height="22" rx="11" fill="#E3E4EE"></rect>' +
        '<rect class="gm-grow" style="animation-delay:.5s" x="40" y="76" width="210" height="22" rx="11" fill="#1A1FB0"></rect>' +
        '<line x1="320" y1="68" x2="320" y2="106" stroke="#131429" stroke-width="2" stroke-dasharray="3 3"></line>' +
        '<g class="gm-pop" style="animation-delay:1.6s"><text x="145" y="132" text-anchor="middle" font-size="15" font-weight="800" fill="#0F7B3E">' + esc(val) + ' — boj yo\'q</text></g>' + chk(256, 127, 2) +
        '<text class="gm-in" style="animation-delay:2.6s" x="180" y="170" text-anchor="middle" font-size="11" font-weight="600" fill="#6B6C85">ortiqchasiga 30% boj + yig\'im</text>';
    },
    // 5. Qabul: quti + belgi + trek
    function () {
      return '<g class="gm-out"><rect x="120" y="60" width="80" height="66" rx="12" fill="#FDF3E3" stroke="#B45309" stroke-width="2"></rect><path d="M120 88h80M160 60v66" stroke="#B45309" stroke-width="2" opacity=".4"></path></g>' +
        chk(236, 66, 2) +
        '<g class="gm-pop" style="animation-delay:2.5s"><rect x="100" y="146" width="160" height="28" rx="14" fill="#FFFFFF" stroke="#E3E4EE"></rect><text x="180" y="164" text-anchor="middle" font-size="11" font-weight="700" fill="#1A1FB0">Trek: LP123456789' + (M.flow === 'direct' ? 'CN' : 'UZ') + '</text></g>';
    }
  ];

  /* --- karta --- */
  var card = document.createElement('div');
  card.className = 'gm-card';
  panel.insertBefore(card, panel.firstChild);
  var clear = function () { clearTimeout(timer); };
  var tick = function () {
    clear();
    timer = setTimeout(function () {
      if (!playing) return;
      if (step >= n - 1) { playing = false; render(); return; }
      step++; render(); tick();
    }, GM_STEP_MS);
  };
  var start = function () { clear(); open = true; step = 0; playing = true; render(); tick(); };
  var toggle = function () {
    if (playing) { clear(); playing = false; render(); return; }
    if (step >= n - 1) step = 0;
    playing = true; render(); tick();
  };
  var go = function (i) { clear(); step = i; playing = true; render(); tick(); };
  var stop = function () { clear(); open = false; step = 0; playing = false; render(); };

  function render() {
    if (!open) {
      card.innerHTML = '<button type="button" class="gm-open" aria-label="Qanday ishlaydi — animatsiyani ko\'rish">' +
        '<span class="gm-play"><svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" style="margin-left:2px"><path d="M7 5.5v13a1 1 0 001.5.86l11-6.5a1 1 0 000-1.72l-11-6.5A1 1 0 007 5.5z"></path></svg></span>' +
        '<span class="gm-txt"><b>Qanday ishlaydi</b><span>' + Math.round(n * GM_STEP_MS / 1000) + ' soniya · ' + n + ' qadam</span></span>' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A6A7BC" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg></button>';
      card.querySelector('.gm-open').onclick = start;
      return;
    }
    var ended = !playing && step === n - 1;
    var icon = playing
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="#1A1FB0"><rect x="5" y="4" width="5" height="16" rx="1.5"></rect><rect x="14" y="4" width="5" height="16" rx="1.5"></rect></svg>'
      : ended
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1FB0" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="#1A1FB0" style="margin-left:2px"><path d="M7 5.5v13a1 1 0 001.5.86l11-6.5a1 1 0 000-1.72l-11-6.5A1 1 0 007 5.5z"></path></svg>';
    var dots = '';
    for (var i = 0; i < n; i++) dots += '<button type="button" class="gm-dot' + (i === step ? ' on' : '') + '" data-i="' + i + '" aria-label="' + (i + 1) + '-qadam"><span></span></button>';
    card.innerHTML = '<div class="gm-stage" aria-hidden="true"><svg viewBox="0 0 360 200" data-step="' + step + '">' + scenes[step]() + '</svg></div>' +
      '<div class="gm-body"><div class="gm-cap" role="status" aria-live="polite">' + esc(M.caps[step]) + '</div>' +
      '<div class="gm-ctl"><button type="button" class="gm-btn" aria-label="' + (playing ? 'Pauza' : (ended ? 'Qayta ko\'rish' : 'Boshlash')) + '">' + icon + '</button>' + dots +
      '<span class="gm-sp"></span><span class="gm-n">' + (step + 1) + ' / ' + n + '</span>' +
      '<button type="button" class="gm-x" aria-label="Yopish"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6C85" stroke-width="2.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg></button></div></div>';
    card.querySelector('.gm-btn').onclick = toggle;
    card.querySelector('.gm-x').onclick = stop;
    card.querySelectorAll('.gm-dot').forEach(function (d) { d.onclick = function () { go(+d.dataset.i); }; });
  }
  render();
  /* Boshqa tabga o'tilganda to'xtaydi. */
  document.addEventListener('xy:panel', function () { if (open && !panel.classList.contains('active')) stop(); });
  document.querySelectorAll('.tab').forEach(function (t) { t.addEventListener('click', function () { setTimeout(function () { if (open && !panel.classList.contains('active')) stop(); }, 0); }); });
})();
