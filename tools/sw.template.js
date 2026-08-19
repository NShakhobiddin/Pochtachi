/* GENERATSIYA QILINGAN: tools/sw.template.js dan. Qo'lda tahrirlamang — `node tools/build.mjs`.
 *
 * Offline strategiyasi:
 *   - Qobiq (HTML, skript, ikonka, logotip, shrift): o'rnatishda keshlanadi.
 *   - Sahifalar: keshdan darhol, yangi nusxa orqa fonda yuklanadi.
 *   - Qo'llanmalar va boshqa statik fayllar: keshdan beriladi, orqa fonda yangilanadi.
 *   - Google Fonts: keshdan, birinchi marta tarmoqdan.
 *   - Valyuta kursi kabi API so'rovlari keshlanmaydi.
 */
const VERSION = '__VERSION__';
const CACHE = 'xarid-' + VERSION;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isFont = url => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Kurs kabi tashqi API so'rovlari — har doim tarmoqdan, keshsiz.
  if (!sameOrigin && !isFont(url)) return;

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

  // Qolgani: keshdan, orqa fonda yangilanadi.
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
