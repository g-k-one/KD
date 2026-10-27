<script setup lang="ts">
defineProps<{ level: number }>()
</script>

<template>
  <!-- 6 px of plate either side of the number: a two-digit level stretches the plate wide (its picture stretches with
       the box) instead of filling it edge to edge -->
  <span class="relative inline-flex h-6 min-w-6 items-center justify-center px-1.5">
    <!-- the plate is drawn 26 units wide with its corners a touch past that: the picture keeps a 1 unit margin all round
         (so nothing is cut flat) and sits 1 px out on every side, the plate itself landing on the 24 px square -->
    <img src="/img/brand/level-badge.svg" alt="" class="absolute -top-px -left-px h-[calc(100%+2px)] w-[calc(100%+2px)] max-w-none" />
    <!-- measured on the plate the number sat half a pixel left of its middle: nudged back -->
    <span class="type-12 relative translate-x-[0.5px] text-neutral-1 tabular-nums">{{ level }}</span>
  </span>
</template>
