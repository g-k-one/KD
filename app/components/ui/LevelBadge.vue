<script setup lang="ts">
defineProps<{ level: number }>()
</script>

<template>
  <span class="relative inline-flex h-6 min-w-6 items-center justify-center px-1">
    <img src="/img/brand/level-badge.svg" alt="" class="absolute inset-0 size-full" />
    <!-- the plate is a raised tile (its top face ends 2 px above a darker lip): the number sits on the face, 1 px up -->
    <span class="type-12 relative -translate-y-px text-neutral-1">{{ level }}</span>
  </span>
</template>
