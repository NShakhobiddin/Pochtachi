/* GENERATSIYA QILINGAN: tools/sw.template.js dan. Qo'lda tahrirlamang — `node tools/build.mjs`.
 *
 * Offline strategiyasi:
 *   - Qobiq (HTML, skript, ikonka, logotip, shrift): o'rnatishda keshlanadi.
 *   - Sahifalar: keshdan darhol, yangi nusxa orqa fonda yuklanadi.
 *   - Qo'llanmalar va boshqa statik fayllar: keshdan beriladi, orqa fonda yangilanadi.
 *   - Do'kon logotiplari: bir marta yuklanadi va alohida, versiyadan
 *     qat'i nazar saqlanadigan keshda qoladi.
 *   - Valyuta kursi kabi API so'rovlari keshlanmaydi.
 */
const VERSION = 'd750af4000c9';
const CACHE = 'xarid-' + VERSION;
/* Logotiplar keshi ilova versiyasiga bog'lanmaydi: yangilanish chiqqanda
   ular qaytadan yuklanmaydi. */
const LOGO_CACHE = 'xarid-logos-v1';
const PRECACHE = [
  "./",
  "support.js",
  "manifest.webmanifest",
  "data/norms.json",
  "vendor/react.production.min.js",
  "vendor/react-dom.production.min.js",
  "guides/guide-base.css",
  "guides/guide-common.css",
  "guides/guide-engine.js",
  "guides/guide.js",
  "fonts/flags.woff2",
  "fonts/onest-cyrillic-ext.woff2",
  "fonts/onest-cyrillic.woff2",
  "fonts/onest-latin-ext.woff2",
  "fonts/onest-latin.woff2",
  "fonts/text.css",
  "stores/index.json",
  "icons/apple-touch-icon.png",
  "icons/courier-3d.webp",
  "icons/customs-3d.webp",
  "icons/guides-3d.webp",
  "icons/icon-192.png",
  "icons/stores-3d.webp",
  "logos/abuexpress.webp",
  "logos/ase.webp",
  "logos/boxette.webp",
  "logos/cpost.webp",
  "logos/d2d.webp",
  "logos/ethnologistics.webp",
  "logos/globbing.webp",
  "logos/greenpost.webp",
  "logos/humodelivery.webp",
  "logos/janapost.webp",
  "logos/meestchina.webp",
  "logos/mymeest.webp",
  "logos/silkroad.webp",
  "logos/smartpostus.webp",
  "logos/spacexpress.webp",
  "logos/tezparcel.webp",
  "logos/teztezdelivery.webp",
  "logos/wikishopus.webp",
  "logos/yellowpochta.webp",
  "logos/yumecs.webp"
];

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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== LOGO_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Do'kon logotiplari (loyihada saqlanmagan holat uchun favicon xizmati).
const isStoreLogo = url =>
  (url.hostname === 'www.google.com' && url.pathname.startsWith('/s2/favicons')) ||
  /\/stores\/[^/]+\.webp$/.test(url.pathname);

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Do'kon logotipi: bir marta yuklanadi, keyin faqat keshdan — tarmoqqa
  // qayta so'rov yubormaydi (oflaynda ham ko'rinadi).
  if (isStoreLogo(url)) {
    event.respondWith(
      caches.match(req, { cacheName: LOGO_CACHE }).then(hit => hit || fetch(req).then(res => {
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
