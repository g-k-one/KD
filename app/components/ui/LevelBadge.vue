<script setup lang="ts">
defineProps<{ level: number }>()
</script>

<template>
  <span class="relative inline-flex h-6 min-w-6 items-center justify-center px-1">
    <img src="/img/brand/level-badge.svg" alt="" class="absolute inset-0 size-full" />
    <span class="type-12 relative text-neutral-1">{{ level }}</span>
  </span>
</template>
