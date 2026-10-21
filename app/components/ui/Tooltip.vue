<script setup lang="ts">
// Figma "Tooltip": neutral-5 box, 12/Regular neutral-14 text, 8px radius, Elevation/2, 12×6 arrow
// pointing at the target. Placement top. Shows on hover and keyboard focus.
defineProps<{ text: string }>()
</script>

<template>
  <span class="kd-tip-wrap relative inline-flex">
    <slot />
    <span role="tooltip" class="kd-tip pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 flex flex-col items-center max-lg:hidden">
      <span class="type-12-regular rounded-lg bg-neutral-5 px-3 py-2 whitespace-nowrap text-neutral-14 shadow-elevation-2">{{ text }}</span>
      <svg width="12" height="6" viewBox="0 0 12 6" class="-mt-px text-neutral-5" aria-hidden="true"><path d="M0 0h12L6 6z" fill="currentColor" /></svg>
    </span>
  </span>
</template>

<style scoped>
.kd-tip {
  opacity: 0;
  transform: translate(-50%, 4px);
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-tip-wrap:hover .kd-tip {
    opacity: 1;
    transform: translate(-50%, 0);
    transition-delay: 250ms;
  }
}
.kd-tip-wrap:focus-within .kd-tip {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>
