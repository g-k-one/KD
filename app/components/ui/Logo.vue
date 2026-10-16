<script setup lang="ts">
// Mark (rooster) + wordmark from Figma. `muted` is the grey footer version.
withDefaults(defineProps<{ variant?: 'full' | 'mark'; muted?: boolean; height?: number }>(), {
  variant: 'full',
  height: 40,
})
</script>

<template>
  <span class="inline-flex shrink-0 items-center" :style="{ height: `${height}px`, gap: `${height * 0.2}px` }">
    <img
      :src="muted ? '/img/brand/logo-mark-muted.svg' : '/img/brand/logo-mark.svg'"
      alt="KurwaDROP"
      class="h-full w-auto"
      draggable="false"
    />
    <img
      v-if="variant === 'full'"
      :src="muted ? '/img/brand/logo-word-muted.svg' : '/img/brand/logo-word.svg'"
      alt=""
      class="w-auto"
      :style="{ height: `${height * 0.81}px` }"
      draggable="false"
    />
  </span>
</template>
