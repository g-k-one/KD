<script setup lang="ts">
import type { Item } from '#shared/types/api'

// Figma "DropItemCard" (Case): wear + drop chance on top, art, weapon, skin (rarity colour), price.
// drops: how often it dropped in the last 24 h — shown only for a moment when the page "flashes" this card
// (one random card every few seconds, like a flashlight passing over the grid); never on hover.
const props = defineProps<{ item: Item; chance?: string; compact?: boolean; range?: [number, number]; drops?: number; flash?: boolean }>()
const showDrops = computed(() => props.drops != null && props.drops > 0)
const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const { onPointerMove } = useSpotlight()
const rc = computed(() => RARITY_COLOR[props.item.rarity])
</script>

<template>
  <div
    class="kd-drop group kd-spotlight relative flex min-w-0 flex-col items-center gap-2 rounded-3xl p-3 lg:p-4"
    @pointermove="onPointerMove"
  >
    <div class="type-12 flex w-full items-center justify-between uppercase">
      <span class="flex gap-2">
        <span v-if="item.statTrak" class="kd-drop-meta text-brand-light">ST</span>
        <span class="kd-drop-meta">{{ item.wear }}</span>
      </span>
      <!-- Chance by default; on hover the ticket range this item owns (Figma DropItemCard hover) -->
      <span v-if="chance" class="relative grid justify-items-end" :class="range && 'has-range'">
        <span class="kd-drop-meta kd-drop-chance col-start-1 row-start-1 normal-case tabular-nums">{{ chance }}</span>
        <span v-if="range" class="kd-drop-meta kd-drop-range col-start-1 row-start-1 normal-case whitespace-nowrap tabular-nums">{{ fmt(range[0]) }}–{{ fmt(range[1]) }}</span>
      </span>
    </div>
    <span class="relative w-full">
      <ItemArt :image="item.image" :rarity="item.rarity" :size="compact ? 72 : 96" :alt="`${item.weapon} | ${item.skin}`" class="w-full" />
      <span v-if="showDrops" class="kd-drops type-10-caps absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md px-1.5 py-0.5 tabular-nums" :class="flash && 'is-always'">
        <UiIcon name="history" :size="12" />{{ $t('case.drops24h', { n: drops }) }}
      </span>
    </span>
    <div class="flex w-full min-w-0 flex-col items-center gap-1 lg:gap-2">
      <span class="kd-drop-weapon type-12-caps max-w-full truncate">{{ item.weapon }}</span>
      <span class="type-14 max-w-full truncate text-center" :style="{ color: rc }">{{ item.skin }}</span>
      <UiPrice :amount="item.price" />
    </div>
  </div>
</template>

<style scoped>
.kd-drop {
  background: var(--color-neutral-2);
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-drops {
  background: rgb(12 13 16 / 0.72);
  color: var(--color-neutral-13);
  opacity: 0;
  translate: -50% 4px;
  transition:
    opacity var(--dur-base) var(--ease-out),
    translate var(--dur-base) var(--ease-out);
}
.kd-drops.is-always {
  opacity: 1;
  translate: -50% 0;
  color: var(--color-coin);
}
.kd-drop-meta {
  color: var(--color-neutral-8);
  transition: color var(--dur-base) var(--ease-out);
}
.kd-drop-weapon {
  color: var(--color-weapon);
  transition: color var(--dur-base) var(--ease-out);
}
.kd-drop-chance,
.kd-drop-range {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-drop-range {
  opacity: 0;
  transform: translateY(3px);
}
@media (hover: hover) {
  .kd-drop:hover .has-range .kd-drop-chance {
    opacity: 0;
    transform: translateY(-3px);
  }
  .kd-drop:hover .kd-drop-range {
    opacity: 1;
    transform: none;
  }
}
/* Hover: surface to neutral-3, border neutral-6 (softer than Figma's neutral-7, docs/ux-audit-v2.md), meta brightens to neutral-13/14. */
@media (hover: hover) {
  .kd-drop:hover {
    background: var(--color-neutral-3);
  }
  .kd-drop:hover .kd-drop-meta {
    color: var(--color-neutral-13);
  }
  .kd-drop:hover .kd-drop-meta.text-brand-light {
    color: var(--color-brand-light);
  }
  .kd-drop:hover .kd-drop-weapon {
    color: var(--color-neutral-14);
  }
}
</style>
