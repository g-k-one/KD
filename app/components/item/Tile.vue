<script setup lang="ts">
import type { Item } from '#shared/types/api'

// Figma "InventoryItem": Default / Hover / Selected (brand tint + remove icon) / Empty slot.
const props = defineProps<{ item?: Item | null; selected?: boolean; disabled?: boolean }>()
defineEmits<{ toggle: [] }>()
const rc = computed(() => (props.item ? RARITY_COLOR[props.item.rarity] : undefined))
</script>

<template>
  <div v-if="!item" class="grid aspect-[164/128] place-items-center lg:aspect-auto lg:h-[105px] rounded-2xl bg-neutral-3 text-neutral-7">
    <UiIcon name="pistol" :size="40" />
  </div>
  <button
    v-else
    type="button"
    class="kd-tile group relative aspect-[164/128] w-full lg:aspect-auto lg:h-[105px] overflow-hidden rounded-2xl border text-left"
    :aria-pressed="selected"
    :disabled="disabled"
    @click="$emit('toggle')"
  >
    <ItemArt :image="item.image" :rarity="item.rarity" :size="56" class="kd-tile-art absolute inset-0 m-auto w-full" />
    <div class="absolute inset-x-0 top-0 flex flex-col gap-0.5 px-1.5 py-1">
      <UiPrice :amount="item.price" size="s" />
      <span class="type-10-caps flex gap-1">
        <span v-if="item.statTrak" class="text-brand-light">ST</span>
        <span class="kd-tile-meta">{{ item.wear }}</span>
      </span>
    </div>
    <div class="absolute inset-x-0 bottom-0 flex min-w-0 flex-col px-1.5 py-0.5">
      <span class="kd-tile-meta type-10-caps truncate">{{ item.weapon }}</span>
      <span class="type-12 truncate" :style="{ color: rc }">{{ item.skin }}</span>
    </div>
    <UiIcon name="x-circle" :size="24" class="kd-tile-x absolute top-1/2 left-1/2 text-neutral-15" />
  </button>
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
  color: rgb(255 255 255 / 0.48);
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
    border-color: var(--color-neutral-7);
  }
  .kd-tile:hover .kd-tile-meta {
    color: var(--color-neutral-14);
  }
}
.kd-tile:active {
  transform: scale(0.96);
  transition-duration: var(--dur-press);
}
.kd-tile[aria-pressed='true'] {
  background: var(--color-brand-24);
  border-color: var(--color-brand-base);
}
.kd-tile[aria-pressed='true'] .kd-tile-x {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1) rotate(0);
}
.kd-tile:disabled {
  opacity: 0.4;
  pointer-events: none;
}
</style>
