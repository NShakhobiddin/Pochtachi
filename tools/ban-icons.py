"""Taqiqlangan tovarlar ro'yxati uchun ikonkalar.

Har bir pozitsiya o'z darajasining rangida chiziladi: taqiqlangan — qizil,
cheklangan — sariq. Shu bilan qatordagi rangli doira, yorliq matni va
ikonkaning o'zi bir xil narsani aytadi.

Ishlatish:  python3 tools/ban-icons.py <manba-papka>
Chiqish:    icons/ban/*.webp (80 px, ekranda 32 px)
"""
import sys, os
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'icons/glyphs'
SIZE = 80
RED = np.array([0x9B, 0x1C, 0x1C], np.float32)
AMB = np.array([0xB4, 0x53, 0x09], np.float32)

# glif -> (chiqish nomi, daraja rangi)
MAP = [
    ('narcotics',  'giyohvand',   RED), ('weapon',     'qurol',       AMB),
    ('radio',      'radio',       AMB), ('religion',   'diniy',       AMB),
    ('no-declaration','gologramma',RED), ('wildanimal','yovvoyi',     RED),
    ('fertilizer', 'ogit',        AMB), ('chemical',   'kimyoviy',    RED),
    ('cultural',   'madaniy',     AMB), ('animalfood', 'ozuqa',       AMB),
    ('vape',       'vape',        RED), ('explosive',  'portlovchi',  RED),
    ('gambling',   'qimor',       RED), ('laser',      'lazer',       RED),
    ('drone',      'dron',        AMB), ('furnace',    'pech',        RED),
    ('extremist',  'ekstremist',  RED), ('currency',   'valyuta',     RED),
    ('liveanimal', 'hayvon',      RED), ('valuables',  'qimmatbaho',  RED),
    ('wine',       'alkogol',     RED), ('drugs',      'dori',        AMB),
]

total = 0
for src, name, ink in MAP:
    path = os.path.join(SRC, src + '.png')
    if not os.path.exists(path):
        print('yo\'q:', path); continue
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)
    lum = (a[:, :, :3] @ np.array([.299, .587, .114], np.float32)) / 255.0
    alpha = a[:, :, 3] / 255.0 * np.clip((1 - lum) * 1.15, 0, 1)
    rgb = np.broadcast_to(ink, a[:, :, :3].shape)
    im = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
    im = im.crop(im.getbbox())
    im.thumbnail((SIZE, SIZE), Image.LANCZOS)
    out = f'icons/ban/{name}.webp'
    im.save(out, 'WEBP', lossless=True, method=6, exact=True)
    total += os.path.getsize(out)
print(f'{len(MAP)} ta ikonka, jami {total // 1024} KB')
