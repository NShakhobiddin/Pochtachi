#!/usr/bin/env python3
"""3D va tekis ikonkalarni brend tonига keltiradi.

Nima uchun: ikonkalar eski binafsha (ton ~246-250) da chizilgan, ilova
esa logotipning ko'k oilasiga (ton 238) o'tdi. Rasterda rang kod bilan
o'zgarmaydi, shuning uchun manba fayllarning o'zi buriladi.

Faqat ton buriladi — yorug'lik va to'yinganlik tegilmaydi, ya'ni 3D
soyalar va shakl buzilmaydi. Har bir fayl uchun ustun ton o'lchanadi va
shu farqqa butun rasm suriladi (hammasini 238 ga tenglashtirish rasm
ichidagi tabiiy ton o'yinini yo'q qilardi).

Ishlatish: python3 tools/brand-tint.py [--check]
Keyin:     npm run icons
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'icons' / 'src'
TARGET = 238.0     # logotipning toni
BAND = (236.0, 258.0)   # shu oraliqdagi ustun ton buriladi
TOL = 4.0          # --check da ruxsat etilgan chetlanish


def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a[..., :3].max(-1), a[..., :3].min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    with np.errstate(invalid='ignore', divide='ignore'):
        h = np.where(mx == r, ((g - b) / d) % 6, h)
        h = np.where(mx == g, (b - r) / d + 2, h)
        h = np.where(mx == b, (r - g) / d + 4, h)
    h = np.where(d == 0, 0, h * 60)
    s = np.where(mx == 0, 0, d / np.where(mx == 0, 1, mx))
    return h, s, mx


def dominant(im):
    a = np.asarray(im).astype(np.float32) / 255
    h, s, v = hsv(a)
    m = (a[..., 3] > .78) & (s > .3) & (v > .15)
    if m.sum() < 40:
        return None
    return float(np.median(h[m]))


def shift(im, delta):
    a = np.asarray(im).astype(np.float32) / 255
    h, s, v = hsv(a)
    m = (s > .08)
    h2 = np.where(m, (h + delta) % 360, h)
    # HSV -> RGB
    c = v * s
    x = c * (1 - np.abs((h2 / 60) % 2 - 1))
    mn = v - c
    i = (h2 // 60).astype(int) % 6
    r = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [c, x, 0, 0, x, c])
    g = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [x, c, c, x, 0, 0])
    b = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [0, 0, x, c, c, x])
    out = np.dstack([(r + mn), (g + mn), (b + mn), a[..., 3]])
    return Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8), 'RGBA')


def main():
    check = '--check' in sys.argv
    # brand*.webp — logotipning asl nusxasi, unga tegilmaydi
    files = [f for f in sorted(SRC.glob('*.webp')) if not f.name.startswith('brand')]
    if not files:
        print(f'{SRC} bo\'sh')
        return 1
    bad, moved = [], 0
    for f in files:
        im = Image.open(f).convert('RGBA')
        d = dominant(im)
        if d is None:
            continue
        if check:
            if BAND[0] <= d <= BAND[1] and abs(d - TARGET) > TOL:
                bad.append(f'{f.name}: ton {d:.0f}')
            continue
        if not (BAND[0] <= d <= BAND[1]) or abs(d - TARGET) <= 0.5:
            continue
        shift(im, TARGET - d).save(f, 'WEBP', lossless=True)
        print(f'  {f.name}: ton {d:.0f} -> {TARGET:.0f}')
        moved += 1
    if check:
        for b in bad:
            print(' XATO ', b)
        if bad:
            print('\nBrend toniga keltirish: python3 tools/brand-tint.py, keyin npm run icons')
            return 1
        print(f'{len(files)} ta manba ikonka brend tonida.')
        return 0
    print(f'{moved} ta fayl burildi. Endi: npm run icons')
    return 0


if __name__ == '__main__':
    sys.exit(main())
