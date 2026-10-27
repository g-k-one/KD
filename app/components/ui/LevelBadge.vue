<script setup lang="ts">
defineProps<{ level: number }>()
</script>

<template>
  <span class="relative inline-flex h-6 min-w-6 items-center justify-center px-1">
    <!-- the plate is drawn 26 units wide with its corners a touch past that: the picture keeps a 1 unit margin all round
         (so nothing is cut flat) and sits 1 px out on every side, the plate itself landing on the 24 px square -->
    <img src="/img/brand/level-badge.svg" alt="" class="absolute -top-px -left-px h-[calc(100%+2px)] w-[calc(100%+2px)] max-w-none" />
    <span class="type-12 relative text-neutral-1">{{ level }}</span>
  </span>
</template>
