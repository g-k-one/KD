<script setup lang="ts">
import type { Item } from '#shared/types/api'

// Figma "InventoryItem": Default / Hover / Selected (brand tint + remove icon) / Empty slot.
// hint: a small label in the top-right corner (the upgrade chance for this target); near: highlighted by the chance slider
// readonly: the same card as a plain div (PvP drops), no hover lift or toggle
// Phones (three to a row, ~100 px wide): a taller 4:5 tile with the words in their own bands — the price and the chance
// on top, the skin in the middle, the wear with the weapon and the skin's name at the bottom — so none of it lies on the art
const props = defineProps<{ item?: Item | null; selected?: boolean; disabled?: boolean; hint?: string; near?: boolean; readonly?: boolean }>()
defineEmits<{ toggle: [] }>()
const rc = computed(() => (props.item ? RARITY_COLOR[props.item.rarity] : undefined))
</script>

<template>
  <div v-if="!item" class="grid aspect-[164/128] place-items-center max-sm:aspect-square lg:aspect-auto lg:h-[105px] rounded-2xl bg-neutral-3 text-neutral-7">
    <UiIcon name="pistol" :size="40" />
  </div>
  <component
    :is="readonly ? 'div' : 'button'"
    v-else
    :type="readonly ? undefined : 'button'"
    class="kd-tile group relative aspect-[164/128] w-full max-sm:aspect-square lg:aspect-auto lg:h-[105px] overflow-hidden rounded-2xl border text-left"
    :class="readonly && 'is-readonly'"
    :aria-pressed="selected"
    :data-near="near || undefined"
    :disabled="disabled"
    @click="$emit('toggle')"
  >
    <span class="absolute inset-0 grid place-items-center max-sm:top-5 max-sm:bottom-8"><ItemArt :image="item.image" :rarity="item.rarity" :size="56" class="kd-tile-art w-full" /></span>
    <div class="absolute inset-x-0 top-0 flex flex-col gap-0.5 px-1.5 py-1">
      <!-- prices are short (12.9k), so the chance hint fits at the top edge beside them -->
      <span class="flex items-center gap-1">
        <UiPrice :amount="item.price" size="s" compact />
        <span v-if="hint" class="kd-tile-hint type-10-caps ml-auto rounded-xs px-1 py-px tabular-nums">{{ hint }}</span>
      </span>
      <span class="type-10-caps flex items-center gap-1 max-sm:hidden">
        <span v-if="item.statTrak" class="text-brand-light">ST</span>
        <span class="kd-tile-meta">{{ item.wear }}</span>
      </span>
    </div>
    <div class="absolute inset-x-0 bottom-0 flex min-w-0 flex-col px-1.5 py-0.5">
      <span class="kd-tile-meta type-10-caps truncate">
        <span class="sm:hidden"><span v-if="item.statTrak" class="text-brand-light">ST </span>{{ item.wear }} · </span>{{ item.weapon }}
      </span>
      <span class="type-12 truncate" :style="{ color: rc }">{{ item.skin }}</span>
    </div>
    <UiIcon v-if="!readonly" name="x-circle" :size="24" class="kd-tile-x absolute top-1/2 left-1/2 text-neutral-15" />
  </component>
</template>

<style scoped>
.kd-tile {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-4);
  transition:
    background-color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}
.kd-tile-meta {
  color: var(--color-weapon);
  transition: color var(--dur-base) var(--ease-out);
}
.kd-tile-x {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.5) rotate(-90deg);
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
@media (hover: hover) {
  .kd-tile:hover {
    background: var(--color-neutral-4);
    border-color: var(--color-neutral-6);
  }
  .kd-tile:hover .kd-tile-meta {
    color: var(--color-neutral-14);
  }
}
.kd-tile.is-readonly {
  pointer-events: none;
}
.kd-tile:active {
  transform: scale(0.96);
  transition-duration: var(--dur-press);
}
.kd-tile[aria-pressed='true'] {
  background: var(--color-brand-24);
  border-color: rgb(var(--brand-rgb) / 0.35);
}
.kd-tile[aria-pressed='true'] .kd-tile-x {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1) rotate(0);
}
.kd-tile-hint {
  background: rgb(var(--dark-rgb) / 0.7);
  color: var(--color-neutral-13);
  transition: color var(--dur-base) var(--ease-out), background-color var(--dur-base) var(--ease-out);
}
/* Chance slider: tiles near the wanted chance light up */
.kd-tile[data-near] {
  border-color: rgb(var(--success-rgb) / 0.6);
  box-shadow: 0 0 16px -6px var(--color-success);
}
.kd-tile[data-near] .kd-tile-hint {
  background: var(--color-success-24);
  color: var(--color-success);
}
.kd-tile:disabled {
  opacity: 0.4;
  pointer-events: none;
}
</style>
