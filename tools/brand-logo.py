#!/usr/bin/env python3
"""Pochtam logotipidan ilova uchun kerakli o'lchamlarni tayyorlaydi.

Manba: icons/src/intro/*.png — logotipning vektor eksporti bo'lakma-bo'lak
(olti burchak, ichidagi yashil `p`, so'ng `Pochtam.` harflari). O'sha
bo'laklardan brend introsi ham yig'iladi, ya'ni logotip va animatsiya bitta
manbadan chiqadi va hech qachon bir-biridan uzoqlashmaydi.

Natija:
  icons/brand.webp          lokap — sarlavha uchun (96 px balandlikda, shiorsiz)
  icons/brand-full.webp     to'liq lokap — tanishuv ekrani uchun (560 px kenglikda)
  icons/icon-192.png        ilova ikonkasi (PWA)
  icons/apple-touch-icon.png iOS uchun

Ishlatish: python3 tools/brand-logo.py [--check]
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'icons' / 'src' / 'intro'
OUT = ROOT / 'icons'

# Olti burchak ichida yashil `p` shu nuqtada turadi (bo'laklarning asl
# koordinatalari — introdagi choreografiya ham shundan hisoblaydi).
P_AT = (410, 274)

# So'z-belgi harflari: (fayl, asl x, kengligi). Balandligi hammasida 288.
GLYPHS = [('P', 897, 206), ('o', 1123, 214), ('c', 1361, 198), ('h', 1585, 194),
          ('t', 1804, 134), ('a', 1966, 218), ('m', 2228, 303), ('dot', 2567, 52)]
WORD_X0, WORD_X1, WORD_H = 897, 2619, 288

# Yashil `m` ortidagi ko'k to'rtburchak: harfning to'liq kengligi, x-balandlik
# ustidan tayanch chizig'igacha. Rang — so'z-belgidagi ko'kning o'zi.
BOX_GLYPH = 'm'
BOX_TOP, BOX_BOTTOM = 74, 282
BOX_FILL = (11, 15, 154, 255)

# Lokapning nisbatlari — berilgan logotipdan o'lchab olingan.
WORD_SHARE = 0.543  # so'z-belgi balandligi belgi balandligiga nisbatan
GAP_SHARE = 0.243   # belgi bilan so'z orasi belgi kengligiga nisbatan
TAG_GAP_SHARE = 0.199  # so'z bilan shior orasi so'z balandligiga nisbatan

WORD_PX = 96       # sarlavha lokapi: 36px ekranda, ~2.7x zichlikda
FULL_W = 560       # to'liq lokap: 240px ekranda, ~2.3x zichlikda
ICON = 192         # PWA ikonkasi
APPLE = 180        # iOS ikonkasi
MARK_SHARE = 0.76  # ikonka kvadratining qancha qismini belgi egallaydi


def mark():
    """Olti burchak + ichidagi yashil `p`."""
    im = Image.open(SRC / 'hex.png').convert('RGBA')
    im.alpha_composite(Image.open(SRC / 'p.png').convert('RGBA'), P_AT)
    return im


def word():
    """`Pochtam.` — harflar asl oraliqlari bilan, `m` ortida ko'k quti."""
    im = Image.new('RGBA', (WORD_X1 - WORD_X0, WORD_H), (0, 0, 0, 0))
    for name, x, w in GLYPHS:
        if name == BOX_GLYPH:
            box = Image.new('RGBA', (w, BOX_BOTTOM - BOX_TOP), BOX_FILL)
            im.alpha_composite(box, (x - WORD_X0, BOX_TOP))
        im.alpha_composite(Image.open(SRC / f'{name}.png').convert('RGBA'), (x - WORD_X0, 0))
    return im


def lockup(tagline=False):
    """Belgi va so'z-belgi — yonma-yon, markazi bir chiziqda.

    tagline=True bo'lsa so'z ostiga shior qo'shiladi va belgi butun
    ustunning (so'z + shior) markaziga tenglashadi. Sarlavhada shior yo'q:
    36 px balandlikdagi lokapda uning harflari 4 px ga tushib qolardi.
    """
    m, w = mark(), word()
    wh = round(m.height * WORD_SHARE)
    k = wh / w.height
    w = w.resize((round(w.width * k), wh), Image.LANCZOS)

    text = w
    if tagline:
        t = Image.open(SRC / 'tagline.png').convert('RGBA')
        t = t.resize((round(t.width * k), round(t.height * k)), Image.LANCZOS)
        gap = round(wh * TAG_GAP_SHARE)
        text = Image.new('RGBA', (max(w.width, t.width), wh + gap + t.height), (0, 0, 0, 0))
        text.alpha_composite(w, (0, 0))
        text.alpha_composite(t, (0, wh + gap))

    gap = round(m.width * GAP_SHARE)
    im = Image.new('RGBA', (m.width + gap + text.width, m.height), (0, 0, 0, 0))
    im.alpha_composite(m, (0, 0))
    im.alpha_composite(text, (m.width + gap, (m.height - text.height) // 2))
    return im


def to_h(im, h):
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)


def to_w(im, w):
    return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)


def icon(m, size):
    """Belgini oq kvadrat ustiga markazlashtiradi.

    Oq fon: ikonka telefonda va Telegram ro'yxatida shaffof bo'lsa,
    tizim uni qora bilan to'ldiradi va ko'k belgi yo'qoladi.
    """
    inner = round(size * MARK_SHARE)
    im = m.copy()
    im.thumbnail((inner, inner), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return canvas.convert('RGB')


def main():
    check = '--check' in sys.argv
    missing = [n for n in ['hex.png', 'p.png', 'tagline.png']
               + [f'{g[0]}.png' for g in GLYPHS] if not (SRC / n).exists()]
    if missing:
        print(f' XATO  {SRC} da yo\'q: {", ".join(missing)}')
        return 1

    made = [
        ('brand.webp', to_h(lockup(), WORD_PX)),
        ('brand-full.webp', to_w(lockup(tagline=True), FULL_W)),
        ('icon-192.png', icon(mark(), ICON)),
        ('apple-touch-icon.png', icon(mark(), APPLE)),
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
