<script setup lang="ts">
defineProps<{ level: number }>()
</script>

<template>
  <span class="relative inline-flex h-6 min-w-6 items-center justify-center px-1">
    <!-- the plate's rounded corners reach 1 px past its 24 px square: its picture has a 1 px margin all round and sits 1 px
         out on every side, so the corners are drawn whole instead of cut flat -->
    <img src="/img/brand/level-badge.svg" alt="" class="absolute -top-px -left-px h-[calc(100%+2px)] w-[calc(100%+2px)] max-w-none" />
    <!-- the plate is a raised tile (its top face ends 2 px above a darker lip): the number sits on the face, 1 px up -->
    <span class="type-12 relative -translate-y-px text-neutral-1">{{ level }}</span>
  </span>
</template>
