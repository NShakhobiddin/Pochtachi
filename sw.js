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
const VERSION = '6147cab2aa81';
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
  "icons/app-play.webp",
  "icons/app-store.webp",
  "icons/apple-touch-icon.png",
  "icons/ban/alkogol.webp",
  "icons/ban/diniy.webp",
  "icons/ban/dori.webp",
  "icons/ban/dron.webp",
  "icons/ban/ekstremist.webp",
  "icons/ban/giyohvand.webp",
  "icons/ban/gologramma.webp",
  "icons/ban/hayvon.webp",
  "icons/ban/kimyoviy.webp",
  "icons/ban/lazer.webp",
  "icons/ban/madaniy.webp",
  "icons/ban/ogit.webp",
  "icons/ban/ozuqa.webp",
  "icons/ban/pech.webp",
  "icons/ban/portlovchi.webp",
  "icons/ban/qimmatbaho.webp",
  "icons/ban/qimor.webp",
  "icons/ban/qurol.webp",
  "icons/ban/radio.webp",
  "icons/ban/valyuta.webp",
  "icons/ban/vape.webp",
  "icons/ban/yovvoyi.webp",
  "icons/boj-aloqa.webp",
  "icons/boj-kalkulyator.webp",
  "icons/boj-meyor.webp",
  "icons/boj-taqiq.webp",
  "icons/boj-tartib.webp",
  "icons/boj-tolov.webp",
  "icons/brand-full.webp",
  "icons/brand.webp",
  "icons/courier-3d.webp",
  "icons/customs-3d.webp",
  "icons/dok-bolalar.webp",
  "icons/dok-elektronika.webp",
  "icons/dok-kosmetika.webp",
  "icons/dok-moda.webp",
  "icons/dok-poyabzal.webp",
  "icons/dok-universal.webp",
  "icons/guides-3d.webp",
  "icons/icon-192.png",
  "icons/intro/P.webp",
  "icons/intro/a.webp",
  "icons/intro/c.webp",
  "icons/intro/dot.webp",
  "icons/intro/h.webp",
  "icons/intro/hex.webp",
  "icons/intro/m.webp",
  "icons/intro/o.webp",
  "icons/intro/p.webp",
  "icons/intro/t.webp",
  "icons/intro/tagline.webp",
  "icons/norm/atir.webp",
  "icons/norm/bad.webp",
  "icons/norm/meyor.webp",
  "icons/norm/tolov.webp",
  "icons/norm/yigim.webp",
  "icons/stores-3d.webp",
  "icons/svc-bahs.webp",
  "icons/svc-hamkorlik.webp",
  "icons/svc-hisob.webp",
  "icons/svc-hujjat.webp",
  "icons/svc-integratsiya.webp",
  "icons/svc-savol.webp",
  "icons/svc-shartnoma.webp",
  "icons/svc-taqiq.webp",
  "icons/svc-texnik.webp",
  "icons/svc-ushlangan.webp",
  "icons/svc-yuridik.webp",
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
  "logos/yumecs.webp",
  "stores/adidas.webp",
  "stores/aliexpress.webp",
  "stores/amazon.webp",
  "stores/apple.webp",
  "stores/asos.webp",
  "stores/beautybay.webp",
  "stores/bestbuy.webp",
  "stores/bhphoto.webp",
  "stores/carters.webp",
  "stores/ebay.webp",
  "stores/faoschwarz.webp",
  "stores/farfetch.webp",
  "stores/footlocker.webp",
  "stores/hamleys.webp",
  "stores/hm.webp",
  "stores/jdsports.webp",
  "stores/jomashop.webp",
  "stores/lego.webp",
  "stores/lenovo.webp",
  "stores/mattel.webp",
  "stores/microcenter.webp",
  "stores/mytheresa.webp",
  "stores/newbalance.webp",
  "stores/newegg.webp",
  "stores/nike.webp",
  "stores/noon.webp",
  "stores/pinduoduo.webp",
  "stores/poizon.webp",
  "stores/puma.webp",
  "stores/samsung.webp",
  "stores/sephora.webp",
  "stores/shein.webp",
  "stores/smythstoys.webp",
  "stores/taobao.webp",
  "stores/tmall.webp",
  "stores/toysrus.webp",
  "stores/trendyol.webp",
  "stores/ulta.webp",
  "stores/uniqlo.webp",
  "stores/victoriassecret.webp",
  "stores/walmart.webp",
  "stores/xiaomi.webp",
  "stores/zara.webp"
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
