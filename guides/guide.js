// Barcha qo'llanmalar uchun umumiy skript (akkordeon, progress, kalkulyator boshqaruvi).
/* Qo'llanmalarni ilova ichida yanada qulay qilish: bo'lim navigatsiyasi,
   svayp, checklist saqlash, o'qish progressi. Barcha 7 qo'llanma uchun umumiy. */
(function () {
  var tabsWrap = document.getElementById('tabs');
  if (!tabsWrap) return;
  var tabs = function () { return Array.prototype.slice.call(document.querySelectorAll('.tab')); };
  var idx = function () { var t = tabs(); for (var i = 0; i < t.length; i++) if (t[i].classList.contains('active')) return i; return 0; };
  var label = function (el) { return el ? el.textContent.replace(/^\d+/, '').trim() : ''; };

  /* --- o'qish progressi ---
     Ilgari har bir aylantirish hodisasida scrollHeight o'qilib, prog.style.width
     yozilardi: brauzer har kadrda sahifani qaytadan o'lchashga majbur bo'lib,
     aylantirish tutilib qolardi. Endi balandlik keshda turadi, chizish esa
     kadr boshiga bir marta va faqat transform orqali bo'ladi. */
  var prog = document.createElement('i');
  prog.className = 'xy-prog';
  document.querySelector('nav.tabs').appendChild(prog);
  var maxScroll = 0, queued = false;
  var measure = function () {
    maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  };
  var paint = function () {
    queued = false;
    var r = maxScroll > 40 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
    prog.style.transform = 'scaleX(' + r.toFixed(4) + ')';
  };
  var onScroll = function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  };
  var remeasure = function () { measure(); onScroll(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', remeasure);
  /* Bo'lim almashsa yoki panel birinchi marta chizilsa balandlik o'zgaradi. */
  document.addEventListener('xy:panel', remeasure);
  window.addEventListener('load', remeasure);
  measure();

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
  tabsWrap.addEventListener('click', function () { setTimeout(function () { refresh(); remeasure(); }, 0); });
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
    /* Tik aylantirishda tasodifan bo'lim almashib ketmasligi uchun talab
       qattiqroq: harakat aniq gorizontal bo'lishi kerak. */
    if (Math.abs(dx) < 90 || Math.abs(dy) > 40 || Math.abs(dx) < Math.abs(dy) * 2) return;
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

  /* Checklist belgilarini saqlash va tiklash guide-engine.js ichida:
     holat o'sha yerda turadi, shuning uchun ro'yxat bir marta chiziladi. */

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
  var standalone = window.top === window.self;
  var bar = document.getElementById('site-bar');
  if (bar && standalone) bar.hidden = false;
  // Ilova ichida ochilganini CSS ham bilsin (sarlavha ixchamlashadi)
  if (!standalone) document.documentElement.classList.add('in-app');
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
