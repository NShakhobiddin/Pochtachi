"""Bojxona me'yorlari bo'limi uchun belgilar.

Brend rangida, tekis: glifning qorong'i qismi siyoh, oq ichki detallar
teshik bo'ladi. Kartochkalarda 38 px chiziladi.

Ishlatish:  python3 tools/norm-icons.py <manba-papka>
Chiqish:    icons/norm/*.webp (96 px)
"""
import sys, os
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'icons/glyphs'
SIZE = 96
INK = np.array([0x3B, 0x2C, 0xC9], np.float32)

MAP = {
    'tax-free':   'meyor',   # bojsiz me'yor
    'money':      'tolov',   # yagona bojxona to'lovi
    'cash-stack': 'yigim',   # bojxona yig'imi
    'parfum':     'atir',    # atir va ifor taratuvchi suvlar
    'herbal':     'bad',     # biologik faol qo'shimchalar
}

total = 0
for src, name in MAP.items():
    path = os.path.join(SRC, src + '.png')
    if not os.path.exists(path):
        print('yo\'q:', path); continue
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)
    lum = (a[:, :, :3] @ np.array([.299, .587, .114], np.float32)) / 255.0
    alpha = a[:, :, 3] / 255.0 * np.clip((1 - lum) * 1.15, 0, 1)
    rgb = np.broadcast_to(INK, a[:, :, :3].shape)
    im = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
    im = im.crop(im.getbbox())
    im.thumbnail((SIZE, SIZE), Image.LANCZOS)
    out = f'icons/norm/{name}.webp'
    im.save(out, 'WEBP', lossless=True, method=6, exact=True)
    total += os.path.getsize(out)
print(f'{len(MAP)} ta belgi, jami {total // 1024} KB')
