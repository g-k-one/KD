<script setup lang="ts">
import type { Item } from '#shared/types/api'

// Figma "DropItemCard" (Case): wear + drop chance on top, art, weapon, skin (rarity colour), price.
const props = defineProps<{ item: Item; chance?: string; compact?: boolean; range?: [number, number] }>()
const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const { onPointerMove } = useSpotlight()
const rc = computed(() => RARITY_COLOR[props.item.rarity])
</script>

<template>
  <div
    class="kd-drop group kd-spotlight relative flex min-w-0 flex-col items-center gap-2 rounded-3xl border p-3 lg:p-[15px]"
    @pointermove="onPointerMove"
  >
    <div class="type-12 flex w-full items-center justify-between uppercase">
      <span class="flex gap-2">
        <span v-if="item.statTrak" class="kd-drop-meta text-brand-light">ST</span>
        <span class="kd-drop-meta">{{ item.wear }}</span>
      </span>
      <!-- Chance by default; on hover the ticket range this item owns (Figma DropItemCard hover) -->
      <span v-if="chance" class="relative grid justify-items-end">
        <span class="kd-drop-meta kd-drop-chance col-start-1 row-start-1 normal-case tabular-nums">{{ chance }}</span>
        <span v-if="range" class="kd-drop-meta kd-drop-range col-start-1 row-start-1 normal-case whitespace-nowrap tabular-nums">{{ fmt(range[0]) }}–{{ fmt(range[1]) }}</span>
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
  border-color: var(--color-neutral-4);
  transition:
    background-color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out);
}
.kd-drop-meta {
  color: var(--color-neutral-8);
  transition: color var(--dur-base) var(--ease-out);
}
.kd-drop-weapon {
  color: var(--color-neutral-11);
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
  .kd-drop:hover .kd-drop-chance:has(+ .kd-drop-range) {
    opacity: 0;
    transform: translateY(-3px);
  }
  .kd-drop:hover .kd-drop-range {
    opacity: 1;
    transform: none;
  }
}
/* Figma hover: surface to neutral-3, border neutral-7, meta brightens to neutral-13/14. */
@media (hover: hover) {
  .kd-drop:hover {
    background: var(--color-neutral-3);
    border-color: var(--color-neutral-7);
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
