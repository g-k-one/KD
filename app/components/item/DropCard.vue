<script setup lang="ts">
import type { Item } from '#shared/types/api'

// Figma "DropItemCard" (Case): wear + drop chance on top, art, weapon, skin (rarity colour), price.
// drops: how often it dropped in the last 24 h — shown only for a moment when the page "flashes" this card
// (one random card every few seconds, like a flashlight passing over the grid): it takes the chance's place in the
// top row with the same swap as the hover's ticket range, so nothing covers the art.
const props = defineProps<{ item: Item; chance?: string; compact?: boolean; range?: [number, number]; drops?: number; flash?: boolean }>()
// compact (phones): no ticket range and no "N today" — no hover there, and the wide hidden words would push the chance out
const showDrops = computed(() => !props.compact && props.drops != null && props.drops > 0)
const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const { onPointerMove } = useSpotlight()
const rc = computed(() => RARITY_COLOR[props.item.rarity])
</script>

<template>
  <div
    class="kd-drop group kd-spotlight relative flex min-w-0 flex-col items-center rounded-3xl"
    :class="compact ? 'gap-1.5 p-2.5' : 'gap-2 p-3 lg:p-4'"
    @pointermove="onPointerMove"
  >
    <div class="flex w-full items-center justify-between gap-1 uppercase" :class="compact ? 'type-10-caps' : 'type-12'">
      <span class="flex gap-2">
        <span v-if="item.statTrak" class="kd-drop-meta text-brand-light">ST</span>
        <span class="kd-drop-meta">{{ item.wear }}</span>
      </span>
      <!-- Chance by default; on hover the ticket range this item owns (Figma DropItemCard hover) -->
      <span v-if="chance" class="relative grid justify-items-end" :class="[range && !compact && 'has-range', showDrops && flash && 'is-flash']">
        <span class="kd-drop-meta kd-drop-chance col-start-1 row-start-1 normal-case tabular-nums">{{ chance }}</span>
        <span v-if="range && !compact" class="kd-drop-meta kd-drop-range col-start-1 row-start-1 normal-case whitespace-nowrap tabular-nums">{{ fmt(range[0]) }}–{{ fmt(range[1]) }}</span>
        <span v-if="showDrops" class="kd-drop-today col-start-1 row-start-1 flex items-center gap-1 normal-case whitespace-nowrap tabular-nums">
          <UiIcon name="history" :size="12" />{{ $t('case.drops24h', { n: drops }) }}
        </span>
      </span>
    </div>
    <ItemArt :image="item.image" :rarity="item.rarity" :size="compact ? 72 : 96" :alt="`${item.weapon} | ${item.skin}`" class="w-full" />
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
/* "N× today" swaps in for the chance while the flashlight passes over this card */
.kd-drop-today {
  color: var(--color-coin);
  opacity: 0;
  transform: translateY(3px);
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.is-flash .kd-drop-today {
  opacity: 1;
  transform: none;
}
.is-flash .kd-drop-chance {
  opacity: 0;
  transform: translateY(-3px);
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
  /* the pointer's ticket range wins over a passing "N× today" */
  .kd-drop:hover .has-range .kd-drop-today {
    opacity: 0;
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
