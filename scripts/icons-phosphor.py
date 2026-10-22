"""Rebuilds app/assets/icons from Phosphor (bold weight) so every UI icon shares one drawing style.

Usage: python scripts/icons-phosphor.py <path to @phosphor-icons/core/assets/bold>
Brand logos and the custom empty-state illustrations are not touched (see KEEP).
"""
import os
import sys

SRC = sys.argv[1]
OUT = 'app/assets/icons'

# our icon name -> Phosphor name
MAP = {
    'arrow-left': 'arrow-left',
    'arrow-up': 'arrow-up',
    'bonuses': 'gift',
    'camera': 'camera',
    'cases': 'package',
    'check-circle': 'check-circle',
    'check-sm': 'check',
    'check': 'check',
    'chevron-down-sm': 'caret-down',
    'chevron-down': 'caret-down',
    'chevron-left': 'caret-left',
    'chevron-right': 'caret-right',
    'chevron-up': 'caret-up',
    'close': 'x',
    'copy': 'copy',
    'crown': 'crown-simple',
    'demo': 'play-circle',
    'diamond': 'diamond',
    'eye': 'eye',
    'fast': 'lightning',
    'chicken': 'bird',
    'fire': 'fire',
    'sparkle': 'sparkle',
    'function': 'function',
    'globe': 'globe',
    'history': 'clock-counter-clockwise',
    'info': 'info',
    'inventory': 'backpack',
    'live': 'broadcast',
    'logout': 'sign-out',
    'm-bonus': 'gift',
    'm-cases': 'package',
    'm-fair': 'shield-check',
    'm-faq': 'question',
    'm-gavel': 'gavel',
    'm-mail': 'envelope',
    'm-menu': 'list',
    'm-pvp': 'sword',
    'm-upgrade': 'arrow-circle-up',
    'minus': 'minus',
    'plus': 'plus',
    'pvp': 'sword',
    'refresh': 'arrow-clockwise',
    'search': 'magnifying-glass',
    'seeds': 'key',
    'settings': 'gear-six',
    'share': 'share-network',
    'shield-check': 'shield-check',
    'shield': 'shield-check',
    'sign-in': 'sign-in',
    'sliders': 'sliders-horizontal',
    'sort': 'arrows-down-up',
    'sound': 'speaker-high',
    'streamer': 'video-camera',
    'trophy': 'trophy',
    'upgrade': 'arrow-circle-up',
    'user-empty': 'user-circle',
    'user': 'user',
    'view-grid': 'squares-four',
    'view-list': 'rows',
    'wallet': 'wallet',
    'x-circle': 'x-circle',
    'x': 'x',
}
# brand logos and illustrations keep their own drawing
KEEP = {'discord', 'steam', 'kick', 'telegram', 'deck-plus', 'target-up', 'stake-empty', 'pistol'}

missing = []
for ours, ph in MAP.items():
    src = os.path.join(SRC, f'{ph}-bold.svg')
    if not os.path.exists(src):
        missing.append(ph)
        continue
    svg = open(src, encoding='utf8').read().strip()
    open(os.path.join(OUT, f'{ours}.svg'), 'w', encoding='utf8').write(svg + '\n')
left = sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.svg') and f[:-4] not in MAP and f[:-4] not in KEEP)
print('missing in phosphor:', missing)
print('not mapped:', left)
