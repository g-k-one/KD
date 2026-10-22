"""
Turns scripts/data/csgogem-cases.json (contents and odds read off CSGOGem) into shared/data/kd-cases.json:
real skins (names, rarity, images from skins.json), real Skinport prices, the original odds as tickets.

CSGOGem prices are in its own coins. Items Skinport has no price for are converted with the median
(Skinport USD / CSGOGem coins) of the items both know. Their coin does not track real prices closely, so the
case price is set from the real contents instead: expected value / 0.92 (our usual 92% RTP); contents and
odds stay CSGOGem's. 1 coin = 1 USD, prices in cents.

Usage: python scripts/import-gem-cases.py <folder with skins.json and skinport.json>
"""
import json
import os
import re
import statistics
import sys
import urllib.request

src = sys.argv[1]
skins = json.load(open(os.path.join(src, 'skins.json'), encoding='utf8'))
prices = json.load(open(os.path.join(src, 'skinport.json'), encoding='utf8'))
gem = json.load(open('scripts/data/csgogem-cases.json', encoding='utf8'))

WEAR = {'FN': 'Factory New', 'MW': 'Minimal Wear', 'FT': 'Field-Tested', 'WW': 'Well-Worn', 'BS': 'Battle-Scarred'}
RARITY = {
    'rarity_common_weapon': 'industrial', 'rarity_uncommon_weapon': 'industrial', 'rarity_rare_weapon': 'milspec',
    'rarity_mythical_weapon': 'restricted', 'rarity_legendary_weapon': 'classified', 'rarity_ancient_weapon': 'covert',
    'rarity_contraband_weapon': 'covert',
}
by_name = {}
for s in skins:
    by_name.setdefault(s['name'], s)

slug = lambda t: re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')
TICKETS = 1_000_000
out = []
for case in gem['cases']:
    rows = []
    for weapon, skin, wear, st, gem_price, pct in case['items']:
        base = f'{weapon} | {skin}'
        s = by_name.get(base) or by_name.get(f'★ {base}')
        if not s:
            print('  no skin data:', base)
            continue
        star = s['name'].startswith('★')
        name = ('★ ' if star else '') + ('StatTrak™ ' if st else '') + base
        real = (prices.get(f'{name} ({WEAR[wear]})') or {}).get('starting_at')
        rows.append({'s': s, 'weapon': weapon, 'skin': skin, 'wear': wear, 'st': st, 'gem': gem_price, 'real': real, 'pct': pct, 'star': star})
    ratios = [r['real'] / r['gem'] for r in rows if r['real']]
    f = statistics.median(ratios)
    total_pct = sum(r['pct'] for r in rows)
    items = []
    acc = 0
    for k, r in enumerate(rows):
        iid = slug(f"{r['weapon']}-{r['skin']}-{r['wear']}{'-st' if r['st'] else ''}")
        path = f'public/img/items/cs2/{slug(r["weapon"] + "-" + r["skin"])}.webp'
        if not os.path.exists(path):
            png = path.replace('.webp', '.png')
            req = urllib.request.Request(r['s']['image'], headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as resp, open(png, 'wb') as fh:
                fh.write(resp.read())
        price = r['real'] if r['real'] else r['gem'] * f
        # odds renormalised without the stickers; the last item takes the rounding remainder
        t = TICKETS - acc if k == len(rows) - 1 else max(1, round(r['pct'] / total_pct * TICKETS))
        acc += t
        items.append({
            'id': iid,
            'weapon': r['weapon'],
            'skin': r['skin'],
            'rarity': 'gold' if r['star'] else RARITY.get(r['s']['rarity']['id'], 'covert'),
            'wear': r['wear'],
            **({'statTrak': True} if r['st'] else {}),
            'image': '/' + path.replace('public/', ''),
            'price': int(round(price * 100)),
            'tickets': t,
        })
    ev = sum(i['price'] * i['tickets'] / TICKETS for i in items)
    case_price = int(round(ev / 0.92))
    out.append({'name': case['name'], 'slug': slug(case['name']), 'price': case_price, 'items': items})
    print(f"{case['name']}: {len(items)} items, price {case_price / 100:.2f}, RTP {ev / case_price:.1%} (rate {f:.4f})")

with open('shared/data/kd-cases.json', 'w', encoding='utf8') as fh:
    json.dump(out, fh, ensure_ascii=False, indent=1)
