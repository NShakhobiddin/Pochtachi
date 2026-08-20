// Barcha qo'llanmalar uchun umumiy skript (akkordeon, progress, kalkulyator boshqaruvi).
/* Qo'llanmalarni ilova ichida yanada qulay qilish: bo'lim navigatsiyasi,
   svayp, checklist saqlash, o'qish progressi. Barcha 7 qo'llanma uchun umumiy. */
(function () {
  var KEY = 'xy-chk:' + location.pathname.split('/').pop();
  var tabsWrap = document.getElementById('tabs');
  if (!tabsWrap) return;
  var tabs = function () { return Array.prototype.slice.call(document.querySelectorAll('.tab')); };
  var idx = function () { var t = tabs(); for (var i = 0; i < t.length; i++) if (t[i].classList.contains('active')) return i; return 0; };
  var label = function (el) { return el ? el.textContent.replace(/^\d+/, '').trim() : ''; };

  /* --- o'qish progressi --- */
  var prog = document.createElement('i');
  prog.className = 'xy-prog';
  document.querySelector('nav.tabs').appendChild(prog);
  var onScroll = function () {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.width = (h > 40 ? Math.min(100, Math.max(0, window.scrollY / h * 100)) : 0) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* --- pastdagi bo'lim navigatsiyasi --- */
  var bar = document.createElement('nav');
  bar.className = 'xy-secnav';
  bar.innerHTML =
    '<button type="button" class="xy-nb" data-d="-1" aria-label="Oldingi bo\'lim">' +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>' +
    '</button>' +
    '<button type="button" class="xy-mid"><b></b><span></span></button>' +
    '<button type="button" class="xy-nb" data-d="1" aria-label="Keyingi bo\'lim">' +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>' +
    '</button>';
  document.body.appendChild(bar);
  var mid = bar.querySelector('.xy-mid');
  var midB = mid.querySelector('b'), midS = mid.querySelector('span');

  var refresh = function () {
    var t = tabs(), i = idx();
    midB.textContent = label(t[i]);
    midS.textContent = (i + 1) + ' / ' + t.length;
    bar.querySelector('[data-d="-1"]').disabled = i <= 0;
    bar.querySelector('[data-d="1"]').disabled = i >= t.length - 1;
  };
  var jump = function (d) {
    var t = tabs(), n = idx() + d;
    if (n < 0 || n >= t.length) return;
    t[n].click();
    refresh();
  };
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('.xy-nb');
    if (b) { jump(+b.dataset.d); return; }
    if (e.target.closest('.xy-mid')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      var a = tabs()[idx()];
      if (a) a.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
  tabsWrap.addEventListener('click', function () { setTimeout(refresh, 0); });
  refresh();

  /* --- svayp: bo'limlar orasida, wizard ichida qadamlar orasida --- */
  var sx = 0, sy = 0, sw = null;
  document.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    sx = t.clientX; sy = t.clientY;
    sw = e.target.closest('.tabs-scroll,.tblwrap,input,select,textarea') ? 'skip'
       : e.target.closest('#wizcard,.wiz-nav') ? 'wiz' : 'sec';
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (sw === 'skip' || !sw) return;
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) < 65 || Math.abs(dy) > 55) return;
    var back = dx > 0;
    if (sw === 'wiz') {
      var b = document.getElementById(back ? 'wprev' : 'wnext');
      if (b && !b.disabled) b.click();
    } else jump(back ? -1 : 1);
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target.tagName || ''))) return;
    if (e.key === 'ArrowRight') jump(1);
    if (e.key === 'ArrowLeft') jump(-1);
  });

  /* --- checklist belgilarini saqlash --- */
  var save = function () {
    var done = Array.prototype.slice.call(document.querySelectorAll('.chk.done')).map(function (el) { return el.dataset.k; });
    try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (err) {}
  };
  document.addEventListener('click', function (e) { if (e.target.closest('.chk')) setTimeout(save, 0); });

  var restore = function () {
    var saved;
    try { saved = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (err) { saved = []; }
    if (!saved.length || !document.querySelector('.chk')) return;
    saved.forEach(function (k) {
      var el = document.querySelector('.chk[data-k="' + k + '"]');
      if (el && !el.classList.contains('done')) el.click();
    });
  };
  restore();

  /* Eski izohni to'g'rilash: belgilar endi saqlanadi */
  Array.prototype.slice.call(document.querySelectorAll('.note')).forEach(function (n) {
    if (/tozalanadi/.test(n.textContent)) {
      var d = n.querySelector('div');
      if (d) d.innerHTML = 'Belgilangan bandlar <b>shu qurilmada saqlanadi</b> — qo\'llanmani yopib, keyin davom ettirsangiz ham joyida qoladi.';
    }
  });
})();

/* Sayt paneli: qo'llanma ilova ichida (iframe) ochilsa yashirin qoladi,
   mustaqil ochilganda esa ilovaga va qo'llanmalar ro'yxatiga havola beradi. */
(function () {
  var bar = document.getElementById('site-bar');
  if (bar && window.top === window.self) bar.hidden = false;
})();

/* Kalkulyator uchun umumiy ma'lumot: bojxona me'yorlari va dollar kursi.
   Me'yorlar ilova bilan bitta manbadan (data/norms.json) olinadi, kurs esa
   ilova saqlab qo'ygan Markaziy bank kursidan — shunda qo'llanmadagi va
   ilovadagi hisob bir xil chiqadi. Ikkalasi ham topilmasa, maydondagi
   qiymatlar o'z holicha qoladi va foydalanuvchi ularni qo'lda o'zgartira oladi. */
(function () {
  if (!document.getElementById('usdrate')) return;

  var recalc = function () { if (typeof window.calc === 'function') window.calc(); };

  // 1. Ilova saqlagan kurs (bir xil domen, shuning uchun tarmoq kerak emas)
  try {
    var cached = JSON.parse(localStorage.getItem('xy_usd_rate') || 'null');
    if (cached && cached.v > 0) {
      var input = document.getElementById('usdrate');
      if (input && Math.round(cached.v) !== Math.round(+input.value)) {
        input.value = Math.round(cached.v);
        recalc();
      }
    }
  } catch (e) {}

  // 2. Amaldagi bojxona me'yorlari
  fetch('../../data/norms.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var rows = d && Array.isArray(d.norms) ? d.norms : null;
      if (!rows || !rows.length) return;
      var today = new Date().toISOString().slice(0, 10);
      var active = rows.filter(function (n) { return n.from <= today; }).pop() || rows[0];
      if (!active || !(active.bhm > 0)) return;
      window.XY_NORMS = active;
      var channel = document.getElementById('channel');
      if (channel && active.freeUsd > 0) {
        // Kuryerlik kanalidagi me'yor qiymatini amaldagi normaga moslaymiz
        Array.prototype.forEach.call(channel.options || [], function (opt) {
          if (/kuryer|kargo/i.test(opt.textContent)) opt.value = String(active.freeUsd);
        });
      }
      recalc();
    })
    .catch(function () {});
})();
