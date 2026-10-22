<script setup lang="ts">
// The price-sort glyph with its state visible: the arrow of the active direction is bright white, the other one
// fades back. desc = expensive first (arrow down), otherwise cheap first (arrow up).
defineProps<{ desc: boolean; size?: number }>()
</script>

<template>
  <svg :width="size ?? 18" :height="size ?? 18" viewBox="0 0 20 20" fill="none" aria-hidden="true" class="kd-sort-arrows" :class="desc ? 'is-desc' : 'is-asc'">
    <path class="kd-up" d="M6.5 15V5m0 0L4 7.5M6.5 5 9 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path class="kd-down" d="M13.5 5v10m0 0L11 12.5m2.5 2.5 2.5-2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

<style scoped>
.kd-sort-arrows path {
  transition:
    opacity var(--dur-base) var(--ease-out),
    color var(--dur-base) var(--ease-out),
    translate var(--dur-base) var(--ease-spring);
}
.is-desc .kd-up,
.is-asc .kd-down {
  opacity: 0.28;
}
.is-desc .kd-down,
.is-asc .kd-up {
  color: var(--color-neutral-15);
}
.is-desc .kd-down {
  translate: 0 1px;
}
.is-asc .kd-up {
  translate: 0 -1px;
}
</style>
