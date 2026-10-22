"""Converts the PNGs under public/img to WebP (capped size) and rewrites every reference in the code and data.

Usage: python scripts/png-to-webp.py
Case art / items are shown at ≤ 240 CSS px → 480 px is enough for 2× screens; illustrations get 1200 px.
"""
import os
import re
from PIL import Image

ROOT = 'public/img'
CAP = {'cases': 480, 'items': 480, 'brand': 1200, 'illustrations': 1200}
converted = []
for dirpath, _, files in os.walk(ROOT):
    for f in files:
        if not f.lower().endswith('.png'):
            continue
        src = os.path.join(dirpath, f)
        top = os.path.relpath(dirpath, ROOT).split(os.sep)[0]
        cap = CAP.get(top, 800)
        im = Image.open(src)
        im = im.convert('RGBA') if im.mode in ('P', 'LA', 'RGBA') else im.convert('RGB')
        if max(im.size) > cap:
            im.thumbnail((cap, cap), Image.LANCZOS)
        dst = src[:-4] + '.webp'
        im.save(dst, 'WEBP', quality=86, method=6)
        before, after = os.path.getsize(src), os.path.getsize(dst)
        os.remove(src)
        converted.append(('/' + os.path.relpath(src, 'public').replace(os.sep, '/'), before, after))

# rewrite references
paths = {c[0]: c[0][:-4] + '.webp' for c in converted}
for base in ['app', 'server', 'shared', 'scripts', 'docs']:
    for dirpath, _, files in os.walk(base):
        for f in files:
            if not f.endswith(('.vue', '.ts', '.json', '.md', '.css', '.mjs')):
                continue
            p = os.path.join(dirpath, f)
            s = open(p, encoding='utf8').read()
            s2 = s
            for old, new in paths.items():
                s2 = s2.replace(old, new)
            if s2 != s:
                open(p, 'w', encoding='utf8').write(s2)
                print('refs:', p)

tb = sum(c[1] for c in converted)
ta = sum(c[2] for c in converted)
print(f'{len(converted)} files: {tb/1e6:.2f} MB -> {ta/1e6:.2f} MB')
