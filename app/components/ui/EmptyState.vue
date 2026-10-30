<script setup lang="ts">
// The one empty state of the kit (docs/ux-research-v3.md → A3): the chicken mascot, a line of text, an action.
// Each place has its own chicken doing what the line says (public/img/moods, cut by scripts/cut-sheet.py from the
// sheets in docs/ART_PROMPTS.md → 2): an empty case for an empty inventory, a blank scroll for no history, a magnifier
// for no match, the dice for no rolls yet, the teasing laugh for a guest on the upgrade.
export type EmptyArt = 'empty-inventory' | 'empty-history' | 'empty-search' | 'empty-pvp' | 'no-rolls' | 'guest-upgrade' | 'guest-rolls' | 'signed-out' | 'error'
defineProps<{ text: string; art: EmptyArt }>()
</script>

<template>
  <div class="flex flex-col items-center gap-4 kd-panel px-6 py-12 text-center lg:py-16">
    <img :src="`/img/moods/${art}.webp`" alt="" class="kd-empty-art block size-24 object-contain lg:size-28" draggable="false" loading="lazy" />
    <p class="type-14-regular max-w-72 text-neutral-12">{{ text }}</p>
    <slot />
  </div>
</template>

<style scoped>
.kd-empty-art {
  filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.5));
}
</style>
