<script setup lang="ts">
// Figma "BattleCase": case thumbnail for rows, the round strip and the create summary.
// State: Default / Current (round in progress, brand tint) / Done (opened, art dimmed).
withDefaults(defineProps<{ image: string; name?: string; qty?: number; size?: 's' | 'm'; state?: 'default' | 'current' | 'done' }>(), {
  size: 'm',
  state: 'default',
})
</script>

<template>
  <div
    class="kd-bcase relative shrink-0 overflow-hidden"
    :class="[size === 'm' ? 'size-14 rounded-2xl' : 'size-11 rounded-xl', `is-${state}`]"
    :title="name"
  >
    <img
      :src="image"
      :alt="name ?? ''"
      class="kd-bcase-art absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain transition-opacity duration-300"
      :class="[size === 'm' ? 'size-11' : 'size-8.5', state === 'done' && 'opacity-48']"
    />
    <span v-if="qty && qty > 1" class="type-12 absolute right-0.5 bottom-0.5 rounded-sm bg-neutral-5 px-1.5 py-0.5 text-neutral-12">×{{ qty }}</span>
  </div>
</template>

<style scoped>
.kd-bcase {
  background: var(--color-neutral-3);
  border: 1px solid transparent;
  transition:
    background-color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
/* many case pictures are cut flat at their own edges (a rifle, a bottle): a soft round fade dissolves those cuts
   inside the tile instead of showing a bitten-off edge */
.kd-bcase-art {
  mask-image: radial-gradient(closest-side, #000 72%, transparent 100%);
}
.kd-bcase.is-current {
  background: var(--color-brand-24);
  border-color: var(--color-brand-base);
  transform: scale(1.06);
}
</style>
