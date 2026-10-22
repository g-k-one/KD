"""Merges keys into i18n/locales/en.json: python scripts/i18n-add.py '{"case": {"x": "y"}}'"""
import json
import sys

PATH = 'i18n/locales/en.json'


def merge(dst, src):
    for k, v in src.items():
        if isinstance(v, dict):
            merge(dst.setdefault(k, {}), v)
        else:
            dst[k] = v


data = json.load(open(PATH, encoding='utf8'))
merge(data, json.loads(sys.argv[1] if len(sys.argv) > 1 else sys.stdin.buffer.read().decode('utf8')))
with open(PATH, 'w', encoding='utf8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')
