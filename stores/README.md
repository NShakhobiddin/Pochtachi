# Do'kon logotiplari

`<do'kon-id>.webp` — 43 ta do'konning logotipi, 224x112 px WebP (jami ~178 KB).
Logotiplar so'z-belgi (wordmark) ko'rinishida, shaffof fonli — shuning uchun
ilovada kvadrat emas, cho'ziq qutida ko'rsatiladi.

`src/` — asl 320x160 PNG nusxalar (saytga chiqmaydi) va `stores-sprite.json`
(nom, tur va brend rangi). Ular saqlanadi, chunki dizayn o'lchami o'zgarsa
qayta yasash kerak bo'ladi.

## Qayta yasash

```bash
npm run store-logos -- --from stores/src --force   # src/ dan qayta yasaydi
npm run build                                      # service worker ro'yxati
```

Tarmoqdan (favicon xizmatlaridan) yuklash rejimi ham bor — `npm run store-logos`
— ammo u past sifatli kvadrat favicon beradi, shuning uchun faqat zaxira yo'l.

`--from` rejimida fayllar do'konlarga moslanadi: yonida `logo_manifest.csv`
bo'lsa `domain` ustuni bo'yicha, bo'lmasa fayl nomidan (`taobao.png` ->
`taobao`).

## Ilova qanday ishlatadi

`index.json` — mavjud logotiplar ro'yxati. Ilova shu ro'yxatga qarab rasmni
faqat o'z domenidan oladi. Ro'yxat bo'sh bo'lmasa, unda yo'q do'kon uchun
tashqi xizmatga murojaat qilinmaydi — rangli monogramma ko'rinadi. Shu sababli
ilova hech qanday uchinchi tomon serveriga bog'lanmaydi (smoke test tekshiradi).

Hozir 43 ta do'konning hammasida logotip bor.

Logotiplar tegishli brendlarning tovar belgilari; ular faqat o'sha do'konni
ko'rsatish uchun ishlatiladi.
