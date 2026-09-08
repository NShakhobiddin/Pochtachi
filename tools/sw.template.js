/* GENERATSIYA QILINGAN: tools/sw.template.js dan. Qo'lda tahrirlamang — `node tools/build.mjs`.
 *
 * Offline strategiyasi:
 *   - Qobiq (HTML, skript, shrift, birinchi ekranlar ikonkalari): o'rnatishda
 *     keshlanadi — ozgina, birinchi ochilishga xalaqit bermaydigan hajm.
 *   - Qolgani (bo'lim ikonkalari, logotiplar, bayroqlar, taqiq va me'yor
 *     belgilari, qo'llanma dvigateli): sahifa tinchigach o'zi 'warm' xabari
 *     yuboradi, shunda ikki oqimda, keshda yo'qlari yuklanadi. Ilgari 161
 *     fayl bir yo'la yuklanardi va foydalanuvchi shu paytda ochgan ekranning
 *     ikonkalari bilan bitta kanalni talashardi. Bu ishni `activate` ichida
 *     qilib bo'lmaydi: faollashuv tugamaguncha fetch hodisalari kutib
 *     turadi va ilova ochilishi bir necha soniyaga cho'zilardi.
 *   - Rasm, shrift, CSS va vendor skriptlar: faqat keshdan (versiya kesh nomida,
 *     yangilanish chiqqanda butun kesh almashadi). Ilgari har chizilganda
 *     orqa fonda qayta so'ralardi — takroriy ochilishda ham tarmoq band edi.
 *   - Sahifa, skript va JSON: keshdan darhol, yangi nusxa orqa fonda.
 *   - Do'kon logotiplari: versiyadan qat'i nazar saqlanadigan alohida keshda.
 *   - Valyuta kursi kabi API so'rovlari keshlanmaydi.
 */
const VERSION = '__VERSION__';
const CACHE = 'xarid-' + VERSION;
/* Logotiplar keshi ilova versiyasiga bog'lanmaydi: yangilanish chiqqanda
   ular qaytadan yuklanmaydi. */
const LOGO_CACHE = 'xarid-logos-v1';
const PRECACHE = __PRECACHE__;
const LATER = __LATER__;
const LATER_STREAMS = 2;

/* Ro'yxatni cheklangan oqimda keshlash: addAll hammasini bir yo'la so'raydi
   va sahifaning o'z so'rovlarini siqib qo'yadi. */
function addLimited(cache, list, streams) {
  let i = 0;
  const next = () => {
    if (i >= list.length) return Promise.resolve();
    const url = list[i++];
    return cache.match(url)
      .then(hit => hit ? null : cache.add(url))
      .catch(() => {})
      .then(next);
  };
  return Promise.all(Array.from({ length: streams }, next));
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => addLimited(cache, PRECACHE, 3))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== LOGO_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Sahifa tinchigach 'warm' yuboradi. Keshda bor fayllar o'tkazib
   yuboriladi, shuning uchun har ochilishda arzon. 'warm-done' javobi
   testlar uchun: oflayn tekshiruv to'liq keshni kutadi. */
let warming = null;
self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'warm') return;
  if (!warming) {
    warming = caches.open(CACHE)
      .then(cache => addLimited(cache, LATER, LATER_STREAMS))
      .then(() => { warming = null; });
  }
  event.waitUntil(warming.then(() => {
    if (event.source && event.source.postMessage) { try { event.source.postMessage({ type: 'warm-done' }); } catch (e) {} }
  }));
});

// Do'kon logotiplari (loyihada saqlanmagan holat uchun favicon xizmati).
const isStoreLogo = url =>
  (url.hostname === 'www.google.com' && url.pathname.startsWith('/s2/favicons')) ||
  /\/stores\/[^/]+\.webp$/.test(url.pathname);

/* O'zgarmas fayllar: nomi bir xil qolib, mazmuni o'zgarsa ilova versiyasi
   ham o'zgaradi va yangi kesh ochiladi — shuning uchun ularni qayta
   tekshirish shart emas. */
const isImmutable = url => /\.(webp|png|woff2|css)$/.test(url.pathname) || /\/vendor\//.test(url.pathname);

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Do'kon logotipi: avval versiyali keshdan (isitish o'sha yerga yozadi,
  // yangilanishda almashadi), keyin doimiy logotip keshidan; ikkalasida ham
  // bo'lmasa bir marta yuklanadi va doimiy keshga tushadi. Ilgari faqat
  // doimiy kesh qaralardi va isitilgan logotiplar baribir tarmoqdan kelardi.
  if (isStoreLogo(url)) {
    event.respondWith(
      caches.open(CACHE).then(c => c.match(req))
        .then(hit => hit || caches.match(req, { cacheName: LOGO_CACHE }))
        .then(hit => hit || fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(LOGO_CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req)))
    );
    return;
  }

  // Kurs kabi tashqi API so'rovlari — har doim tarmoqdan, keshsiz.
  // (Shriftlar ham o'z domenimizda, shuning uchun tashqi istisno kerak emas.)
  if (!sameOrigin) return;

  // Sahifalar: keshdagi qobiq darhol beriladi, yangi nusxa orqa fonda olinadi.
  // Sekin yoki uzuq tarmoqda ham ilova bir zumda ochiladi; yangilanish keyingi
  // ochilishda kuchga kiradi (service worker skipWaiting bilan darhol almashadi).
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(req).then(hit => {
        const fresh = fetch(req)
          .then(res => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => hit || caches.match('./'));
        return hit || fresh;
      })
    );
    return;
  }

  // Rasm, shrift, vendor: faqat keshdan; keshda bo'lmasa yuklab, keshga qo'yiladi.
  if (isImmutable(url)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }))
    );
    return;
  }

  // Qolgani (skript, JSON, qo'llanma sahifalari): keshdan, orqa fonda yangilanadi.
  event.respondWith(
    caches.match(req).then(hit => {
      const fresh = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
