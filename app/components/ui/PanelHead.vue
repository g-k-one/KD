<script setup lang="ts">
// The head of a panel, over its hairline: whatever stands in it sits as far from the side as from the top and bottom, on every page.
// The title's 24 px icon in a 56 px row (desktop 72): 16 (24) all round. The tools at the far end, 32 px (40): 12 (16) all round.
// tools: on phones only 40 px tools stand here, a tab names the panel: a 64 px row, 12 all round, no title.
// What follows the title (chips, selects, buttons) comes in the slot, on the same line.
withDefaults(defineProps<{ icon?: string; title?: string; tools?: boolean; tag?: string }>(), { tag: 'span' })
</script>

<template>
  <div class="flex items-center gap-2 border-b border-neutral-4 lg:h-18 lg:pr-4 lg:pl-6" :class="tools ? 'h-16 px-3' : 'h-14 pr-3 pl-4'">
    <UiIcon v-if="icon" :name="icon" :size="24" class="mr-1 shrink-0 text-neutral-13" :class="tools && 'max-lg:hidden'" />
    <component :is="tag" v-if="title" class="type-14 lg:type-16-medium mr-1 whitespace-nowrap" :class="tools && 'max-lg:hidden'">{{ title }}</component>
    <slot />
  </div>
</template>
