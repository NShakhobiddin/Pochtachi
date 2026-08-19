#!/usr/bin/env python3
"""Bayroq emojilari uchun kichik shrift subseti yasaydi.

Google'ning Noto Color Emoji shriftida bayroqlar subseti (U+1F1E6-1F1FF) 693 KB —
saytdagi eng og'ir fayl. Ilovada esa atigi 23 ta bayroq ishlatiladi. Bu skript
faqat o'sha bayroqlarni qoldirib, ~44 KB lik fonts/flags.woff2 ni yasaydi.

Talab:  pip install fonttools brotli
Ishlatish:
    python3 tools/subset_flags.py <noto-color-emoji-flags.woff2>

Manba faylni Google Fonts CSS'idan olish mumkin:
    curl -H 'User-Agent: Mozilla/5.0 Chrome/120' \
      'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap'
va undagi U+1F1E6-1F1FF unicode-range'li @font-face manzilini yuklab olish.
"""
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts', 'flags.woff2')
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Xarid Yordamchisi v2.dc.html')


def flags_in_app():
    """Ilova faylida haqiqatda ishlatilgan bayroqlarni topadi."""
    with open(APP, encoding='utf-8') as fh:
        text = fh.read()
    pairs = re.findall(r'[\U0001F1E6-\U0001F1FF]{2}', text)
    return sorted({''.join(chr(ord(c) - 0x1F1E6 + 65) for c in p) for p in pairs})


def main(src_path):
    codes = flags_in_app()
    font = TTFont(src_path)

    ligatures = {}
    for lookup in font['GSUB'].table.LookupList.Lookup:
        if lookup.LookupType != 4:
            continue
        for sub in lookup.SubTable:
            for base, ligs in sub.ligatures.items():
                for lig in ligs:
                    ligatures[(base, lig.Component[0])] = lig.LigGlyph

    def gname(letter):
        return 'u%04X' % (0x1F1E6 + ord(letter) - 65)

    keep, bases = set(), set()
    for code in codes:
        key = (gname(code[0]), gname(code[1]))
        if key not in ligatures:
            print('Ogohlantirish: %s bayrog\'i shriftda yo\'q' % code)
            continue
        keep.add(ligatures[key])
        bases.update(key)

    options = subset.Options()
    options.layout_closure = False   # aks holda barcha 250+ bayroq saqlanib qoladi
    options.layout_features = ['*']
    options.desubroutinize = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(glyphs=sorted(keep | bases))
    subsetter.subset(font)
    font.flavor = 'woff2'
    font.save(OUT)
    print('%d ta bayroq -> %s (%.0f KB, asl %.0f KB)' % (
        len(keep), os.path.relpath(OUT), os.path.getsize(OUT) / 1024,
        os.path.getsize(src_path) / 1024))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1])
