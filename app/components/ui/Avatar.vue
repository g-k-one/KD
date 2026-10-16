<script setup lang="ts">
withDefaults(defineProps<{ src?: string; size?: 32 | 48; level?: number }>(), { size: 32 })
</script>

<template>
  <span class="relative inline-flex shrink-0 items-center">
    <span
      class="overflow-hidden rounded-full border-2 border-brand-base bg-neutral-7"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      <img v-if="src" :src="src" alt="" class="size-full object-cover" />
    </span>
    <UiLevelBadge v-if="level" :level="level" class="-ml-2" />
  </span>
</template>
