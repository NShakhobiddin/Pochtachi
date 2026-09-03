#!/usr/bin/env python3
"""Pochtam logotipidan ilova uchun kerakli o'lchamlarni tayyorlaydi.

Manba: icons/src/brand.webp — to'liq lokap (belgi + so'z-belgi + shior),
shaffof fonda, 2000px kenglikda.

Natija:
  icons/brand.webp          belgi + so'z-belgi (shiorsiz) — sarlavha uchun
  icons/brand-full.webp     to'liq lokap — tanishuv ekrani uchun
  icons/icon-192.png        ilova ikonkasi (PWA)
  icons/apple-touch-icon.png iOS uchun

Nima uchun ikkita lokap: sarlavhada balandlik 32px, shu o'lchamda shior
harflari 4px ga tushib o'qilmay qoladi — shuning uchun u yerda shior
kesiladi. Tanishuv ekranida joy yetarli, shior to'liq ko'rinadi.

Shior qatorini qo'lda emas, matn qismidagi bo'sh qatorlar bo'yicha
topamiz — logotip qayta chizilsa ham skript ishlayveradi.

Ishlatish: python3 tools/brand-logo.py [--check]
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'icons' / 'src' / 'brand.webp'
OUT = ROOT / 'icons'

ALPHA = 8          # shundan past alfa — bo'sh joy
WORD_H = 96        # sarlavha lokapi: 32px ekranda, 3x zichlikda
FULL_W = 560       # to'liq lokap: 240px ekranda, ~2.3x zichlikda
ICON = 192         # PWA ikonkasi
APPLE = 180        # iOS ikonkasi
MARK_SHARE = 0.76  # ikonka kvadratining qancha qismini belgi egallaydi


def cols_rows(im):
    """Har bir ustun va qatordagi noshaffof piksellar soni."""
    a = im.split()[3].load()
    w, h = im.size
    cols = [0] * w
    rows = [0] * h
    for y in range(h):
        for x in range(w):
            if a[x, y] > ALPHA:
                cols[x] += 1
                rows[y] += 1
    return cols, rows


def trim(im):
    """Shaffof chekkalarni kesadi.

    Image.getbbox() barcha kanallarni hisobga oladi, manbada esa ba'zi
    ko'rinmas piksellar (255,255,255,0) bo'lib saqlangan — shuning uchun
    faqat alfa bo'yicha o'lchaymiz.
    """
    a = im.split()[3].point(lambda v: 255 if v > ALPHA else 0)
    box = a.getbbox()
    return im.crop(box) if box else im


def bands(counts, gap):
    """Ketma-ket to'ldirilgan bo'laklar: [(boshi, oxiri), ...]."""
    out = []
    start = None
    empty = 0
    for i, n in enumerate(counts):
        if n:
            if start is None:
                start = i
            empty = 0
        elif start is not None:
            empty += 1
            if empty > gap:
                out.append((start, i - empty))
                start = None
    if start is not None:
        out.append((start, len(counts) - 1))
    return out


def parts(im):
    """Belgi va matn qismlarining chegaralarini qaytaradi."""
    cols, _ = cols_rows(im)
    cb = bands(cols, gap=im.width // 100)
    if len(cb) < 2:
        raise SystemExit(' XATO  brand.webp: belgi va matn ajralmadi')
    return cb[0], cb[-1]


def drop_tagline(im, text_x):
    """Matn qismining eng pastki qatorini (shiorni) o'chiradi."""
    x0, x1 = text_x
    strip = im.crop((x0, 0, x1 + 1, im.height))
    _, rows = cols_rows(strip)
    rb = bands(rows, gap=im.height // 60)
    if len(rb) < 2:
        raise SystemExit(' XATO  brand.webp: shior qatori topilmadi')
    y0, y1 = rb[-1]
    out = im.copy()
    pad = 2
    out.paste((0, 0, 0, 0), (x0, max(0, y0 - pad), x1 + 1, min(im.height, y1 + 1 + pad)))
    return out


def to_h(im, h):
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)


def to_w(im, w):
    return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)


def icon(mark, size):
    """Belgini oq kvadrat ustiga markazlashtiradi.

    Oq fon: ikonka telefonda va Telegram ro'yxatida shaffof bo'lsa,
    tizim uni qora bilan to'ldiradi va ko'k belgi yo'qoladi.
    """
    inner = round(size * MARK_SHARE)
    m = mark.copy()
    m.thumbnail((inner, inner), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    canvas.paste(m, ((size - m.width) // 2, (size - m.height) // 2), m)
    return canvas.convert('RGB')


def main():
    check = '--check' in sys.argv
    if not SRC.exists():
        print(f' XATO  {SRC} topilmadi')
        return 1
    im = Image.open(SRC).convert('RGBA')
    mark_x, text_x = parts(im)

    full = trim(im)
    word = drop_tagline(im, text_x)
    word = trim(word)
    mark = im.crop((mark_x[0], 0, mark_x[1] + 1, im.height))
    mark = trim(mark)

    made = [
        ('brand.webp', to_h(word, WORD_H)),
        ('brand-full.webp', to_w(full, FULL_W)),
        ('icon-192.png', icon(mark, ICON)),
        ('apple-touch-icon.png', icon(mark, APPLE)),
    ]
    total = 0
    for name, img in made:
        dst = OUT / name
        if check:
            if not dst.exists():
                print(f' XATO  {name} yo\'q')
                return 1
            cur = Image.open(dst)
            if cur.size != img.size:
                print(f' XATO  {name} o\'lchami {cur.size}, kerak {img.size}')
                return 1
        elif name.endswith('.png'):
            img.save(dst, 'PNG', optimize=True)
        else:
            img.save(dst, 'WEBP', quality=84, method=6)
        total += dst.stat().st_size
        print(f'  {name}: {img.size[0]}x{img.size[1]}, {dst.stat().st_size // 1024} KB')
    print(f'{"Tekshirildi" if check else "Tayyor"} — jami {total // 1024} KB.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
