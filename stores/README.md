# Do'kon logotiplari

`<do'kon-id>.webp` — 43 ta do'konning logotipi, 128x128 px WebP (jami ~230 KB).
Logotiplar kvadrat 3D ilova ikonkasi ko'rinishida (burchaklari yumaloqlangan
squircle), shuning uchun ilovada boshqa 3D ikonkalar bilan bir xil kvadrat
uyada chiziladi. Ekranda eng katta 54 px chiziladi — do'kon kartochkasida —
shuning uchun 128 px zich ekranlar uchun ham yetadi.

`src/` — asl 512x512 PNG nusxalar (saytga chiqmaydi). Ular saqlanadi, chunki
dizayn o'lchami o'zgarsa qayta yasash kerak bo'ladi.

## Qayta yasash

```bash
npm run store-logos -- --from stores/src --force   # src/ dan qayta yasaydi
npm run build                                      # service worker ro'yxati
```

Tarmoqdan (favicon xizmatlaridan) yuklash rejimi ham bor — `npm run store-logos`
— ammo u past sifatli kichik favicon beradi, shuning uchun faqat zaxira yo'l.

`--from` rejimida fayllar do'konlarga moslanadi: yonida `logo_manifest.csv`
bo'lsa `domain` ustuni bo'yicha, bo'lmasa fayl nomidan (`taobao.png` ->
`taobao`, so'ng do'kon nomidan). Mos kelmagan fayl haqida skript ogohlantiradi.

## Ilova qanday ishlatadi

`index.json` — mavjud logotiplar ro'yxati. Ilova shu ro'yxatga qarab rasmni
faqat o'z domenidan oladi. Ro'yxat bo'sh bo'lmasa, unda yo'q do'kon uchun
tashqi xizmatga murojaat qilinmaydi — rangli monogramma ko'rinadi. Shu sababli
ilova hech qanday uchinchi tomon serveriga bog'lanmaydi (smoke test tekshiradi).

Hozir 43 ta do'konning hammasida logotip bor.

Logotiplar tegishli brendlarning tovar belgilari; ular faqat o'sha do'konni
ko'rsatish uchun ishlatiladi.
