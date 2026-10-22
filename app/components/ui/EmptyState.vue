<script setup lang="ts">
// The one empty state of the kit (docs/ux-research-v3.md → A3): the chicken mascot, a line of text, an action.
// The art is chicken-moods.webp, two faces side by side: `tired` (sweating, nothing here) or `laugh`.
withDefaults(defineProps<{ text: string; mood?: 'tired' | 'laugh' }>(), { mood: 'tired' })
</script>

<template>
  <div class="flex flex-col items-center gap-4 rounded-5xl bg-neutral-2 px-6 py-12 text-center lg:py-16">
    <span class="kd-empty-art block size-24 overflow-hidden" aria-hidden="true">
      <img
        src="/img/items/chicken-moods.webp"
        alt=""
        class="h-full w-auto max-w-none"
        :style="{ translate: mood === 'tired' ? '-50%' : '0' }"
        draggable="false"
        loading="lazy"
      />
    </span>
    <p class="type-14-regular max-w-72 text-neutral-12">{{ text }}</p>
    <slot />
  </div>
</template>

<style scoped>
.kd-empty-art {
  filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.5));
}
</style>
