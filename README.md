# Xarid Yordamchisi

Chet el do'konlari, kuryerlar, bojxona kalkulyatori va bosqichma-bosqich qo'llanmalar — O'zbekiston uchun mo'ljallangan mobil web-ilova (Claude Design `.dc.html` loyihasi).

## Loyiha tuzilishi

```
index.html                     — GitHub Pages kirish nuqtasi (asosiy faylga yo'naltiradi)
Xarid Yordamchisi v2.dc.html   — asosiy fayl: <x-dc> shabloni + ilova skripti
support.js                     — dc-runtime (shablonni React bilan render qiladi)
manifest.webmanifest           — PWA manifesti
icons/                         — 3D bo'lim ikonkalari va tab-bar ikonkalari (webp) + PWA ikonkalari
logos/                         — 20 ta kuryer xizmati logotipi (png)
guides/inline/                 — 7 ta platforma uchun to'liq qo'llanma (mustaqil HTML, iframe'da ochiladi)
```

### `icons/`

| Fayl | Qayerda ishlatiladi |
| --- | --- |
| `stores-3d.webp`, `courier-3d.webp`, `customs-3d.webp`, `guides-3d.webp` | bosh sahifadagi 4 ta bo'lim kartasi |
| `tab-home{,-off}.webp`, `tab-guides{,-off}.webp`, `tab-customs{,-off}.webp`, `tab-profile{,-off}.webp` | pastki tab-bar (faol / nofaol holat) |
| `icon-192.png`, `apple-touch-icon.png` | favicon va PWA ikonkalari |

## Ishga tushirish

Onlayn: **https://nshakhobiddin.github.io/Pochtachi/** — `index.html` asosiy faylga yo'naltiradi.

Lokal: fayllar statik, istalgan HTTP server yetarli (`file://` orqali ochilmaydi, chunki qo'llanmalar iframe'da yuklanadi):

```bash
python3 -m http.server 8000
# keyin brauzerda: http://localhost:8000/
```

## Tashqi bog'liqliklar

Ilova ishga tushganda quyidagilarni internetdan yuklaydi:

- `react@18.3.1` va `react-dom@18.3.1` (unpkg, SRI bilan) — `support.js` yuklaydi;
- Google Fonts: `Bricolage Grotesque` (600/700/800), `Onest` (400–800), `Noto Color Emoji`;
- valyuta kursi: `cbu.uz` ochiq API (yetib bo'lmasa oflayn zaxira kurs ishlatiladi).

Qolgan hamma narsa (ikonkalar, logotiplar, qo'llanmalar) repozitoriy ichida.
