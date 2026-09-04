#!/usr/bin/env python3
"""Intro animatsiyasi uchun logotip bo'laklarini tayyorlaydi.

Manba: icons/src/intro/*.png — Claude Design loyihasidan olingan asl
bo'laklar (olti burchak, "Pochtam" harflari, yashil P va shior).

Nima uchun bo'lak: animatsiyada har bir harf alohida ko'tariladi, P esa
qutiga tushadi — shuning uchun ular bitta rasm bo'la olmaydi.

O'lcham: sahna 1080 px keng, telefonda esa ~430 px. Ya'ni sahnadagi
o'lcham 0.4 ga qisqaradi; 3x zichlik uchun manba ekrandagi o'lchamdan
uch barobar katta bo'lsa yetadi.

Ishlatish: python3 tools/intro-assets.py [--check]
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'icons' / 'src' / 'intro'
OUT = ROOT / 'icons' / 'intro'

# fayl -> ekrandagi eng katta kenglik (430 px li ekranda)
SCREEN_W = {
    'hex': 207, 'p': 80, 'tagline': 274,
    'P': 33, 'o': 34, 'c': 32, 'h': 31, 't': 21, 'a': 35, 'm': 48, 'dot': 8,
}
DPR = 3


def main():
    check = '--check' in sys.argv
    if not SRC.is_dir():
        print(f'{SRC} topilmadi')
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for f in sorted(SRC.glob('*.png')):
        key = f.stem
        if key not in SCREEN_W:
            print(f' XATO  {key}: kerakli o\'lcham berilmagan')
            return 1
        want = min(SCREEN_W[key] * DPR, Image.open(f).width)
        im = Image.open(f).convert('RGBA')
        h = max(1, round(im.height * want / im.width))
        im = im.resize((want, h), Image.LANCZOS)
        dst = OUT / (key + '.webp')
        if check:
            if not dst.exists():
                print(f' XATO  {dst.name} yo\'q')
                return 1
            if Image.open(dst).size != (want, h):
                print(f' XATO  {dst.name} o\'lchami {Image.open(dst).size}, kerak {(want, h)}')
                return 1
        else:
            im.save(dst, 'WEBP', quality=90, method=6)
        total += dst.stat().st_size
    n = len(list(SRC.glob('*.png')))
    print(f'{"Tekshirildi" if check else "Tayyor"} — {n} ta bo\'lak, jami {total // 1024} KB.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
