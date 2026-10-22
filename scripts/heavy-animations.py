"""Lists infinite CSS animations that animate layout/paint-heavy properties (jank risk on phones).

Usage: python scripts/heavy-animations.py
Infinite loops should animate only transform/translate/scale/rotate/opacity; glows go on a pseudo-element
whose opacity pulses (see .kd-glow-pulse in main.css).
"""
import glob
import os
import re

HEAVY = ['box-shadow', 'filter', 'width', 'height', 'left', 'top', 'background', 'background-position', 'border-color']
files = glob.glob('app/**/*.vue', recursive=True) + ['app/assets/css/main.css']
for f in files:
    s = open(f, encoding='utf8').read()
    for m in re.finditer(r'@keyframes ([\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}', s):
        name, body = m.group(1), m.group(2)
        heavy = [p for p in HEAVY if re.search(r'(^|[\s;{])' + re.escape(p) + r'\s*:', body)]
        if heavy and re.search(r'animation:[^;]*\b' + re.escape(name) + r'\b[^;]*infinite', s):
            print(f.replace(os.sep, '/'), name, heavy)
