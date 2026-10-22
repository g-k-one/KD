"""
Builds the mock's CS2 skin catalog: shared/data/cs2-skins.json + images in public/img/items/cs2/.

Sources (download them into one folder first):
  skins.json   — https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json
                 (names, rarity, wears, Steam CDN image)
  skinport.json — https://prices.csgotrader.app/latest/skinport.json (Skinport "starting at" prices, USD)

Usage: python scripts/import-cs2-skins.py <folder> [--no-images] [--per-band 40]
Images are saved straight as 320px WebP.

Picks --per-band (default 12) well-known skins per price band ($0.05 … $10 000+), one wear each (the cheapest common one
that has a price), so cases at every price have something to pay out. 1 coin = 1 USD, prices in coin cents.
"""
import json
import math
import os
import re
import sys
import urllib.request
import io
from PIL import Image

src = sys.argv[1]
images = '--no-images' not in sys.argv
skins = json.load(open(os.path.join(src, 'skins.json'), encoding='utf8'))
prices = json.load(open(os.path.join(src, 'skinport.json'), encoding='utf8'))

WEAR = {'Factory New': 'FN', 'Minimal Wear': 'MW', 'Field-Tested': 'FT', 'Well-Worn': 'WW', 'Battle-Scarred': 'BS'}
# Preferred wear order when a skin has several: the classic "FT is the default" look, then MW
WEAR_ORDER = ['Field-Tested', 'Minimal Wear', 'Factory New', 'Well-Worn', 'Battle-Scarred']
RARITY = {
    'rarity_common_weapon': 'industrial',
    'rarity_uncommon_weapon': 'industrial',
    'rarity_rare_weapon': 'milspec',
    'rarity_mythical_weapon': 'restricted',
    'rarity_legendary_weapon': 'classified',
    'rarity_ancient_weapon': 'covert',
    'rarity_contraband_weapon': 'covert',
}
# Weapons players know by heart get picked first inside each price band
POPULAR = ['AK-47', 'AWP', 'M4A4', 'M4A1-S', 'Desert Eagle', 'USP-S', 'Glock-18', 'Karambit', 'Butterfly Knife', 'M9 Bayonet',
           'Sport Gloves', 'Specialist Gloves', 'Driver Gloves', 'Talon Knife', 'Skeleton Knife', 'Bayonet', 'Flip Knife',
           'P250', 'Five-SeveN', 'MP9', 'MAC-10', 'P90', 'UMP-45', 'Galil AR', 'FAMAS', 'SSG 08', 'Tec-9', 'CZ75-Auto', 'MP7', 'Nova', 'XM1014']
BANDS = [0.05, 0.3, 1, 3, 10, 30, 100, 300, 1000, 3000, 30000]
PER_BAND = int(sys.argv[sys.argv.index('--per-band') + 1]) if '--per-band' in sys.argv else 12

rows = []
seen_names = set()
for s in skins:
    # note: 'souvenir' only says a souvenir version exists, so it is not a filter
    if not s.get('image') or not s.get('weapon'):
        continue
    name = s['name']
    if name in seen_names:
        continue  # Doppler phases etc. share a name and a price
    seen_names.add(name)
    gold = name.startswith('★')
    rarity = 'gold' if gold else RARITY.get(s['rarity']['id'])
    if not rarity:
        continue
    wears = [w['name'] for w in s.get('wears') or []]
    pick = None
    for w in WEAR_ORDER:
        if w in wears:
            p = (prices.get(f'{name} ({w})') or {}).get('starting_at')
            if p:
                pick = (w, p)
                break
    if not pick:
        continue
    weapon = s['weapon']['name']
    skin = (s.get('pattern') or {}).get('name') or name.split('|')[-1].strip()
    rows.append({'name': name, 'weapon': weapon, 'skin': skin, 'rarity': rarity, 'wear': WEAR[pick[0]], 'price': pick[1], 'img': s['image']})

def rank(r):
    w = r['weapon']
    return (POPULAR.index(w) if w in POPULAR else 99, r['name'])

chosen = []
for lo, hi in zip(BANDS, BANDS[1:]):
    band = sorted([r for r in rows if lo <= r['price'] < hi], key=rank)
    seen = set()
    for r in band:
        if r['weapon'] in seen and len(band) > PER_BAND * 2:
            continue  # spread across weapons when the band is crowded
        seen.add(r['weapon'])
        chosen.append(r)
        if sum(1 for c in chosen if lo <= c['price'] < hi) >= PER_BAND:
            break

slug = lambda t: re.sub(r'[^a-z0-9]+', '-', t.lower().replace('★', '')).strip('-')
out = []
os.makedirs('public/img/items/cs2', exist_ok=True)
for r in sorted(chosen, key=lambda r: -r['price']):
    iid = slug(f"{r['weapon']}-{r['skin']}")
    path = f'public/img/items/cs2/{iid}.webp'
    if images and not os.path.exists(path):
        try:
            req = urllib.request.Request(r['img'], headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                im = Image.open(io.BytesIO(resp.read())).convert('RGBA')
            im.thumbnail((320, 320), Image.LANCZOS)
            im.save(path, 'WEBP', quality=86, method=6)
        except Exception as e:  # skip skins whose image fails to download
            print('skip', iid, e)
            continue
    out.append({'id': iid, 'weapon': r['weapon'].replace('★ ', ''), 'skin': r['skin'], 'rarity': r['rarity'], 'wear': r['wear'], 'image': f'/img/items/cs2/{iid}.webp', 'price': int(round(r['price'] * 100))})

os.makedirs('shared/data', exist_ok=True)
with open('shared/data/cs2-skins.json', 'w', encoding='utf8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(len(out), 'skins;', 'from', min(o['price'] for o in out) / 100, 'to', max(o['price'] for o in out) / 100)
