<script setup lang="ts">
// The head of a panel, over its hairline: one height, one inset and one title on every page. What follows the title (chips,
// selects, buttons) comes in the slot, on the same line. lgTitle: phones show only the tools, where a tab already names the panel.
withDefaults(defineProps<{ icon?: string; title?: string; lgTitle?: boolean; tag?: string }>(), { tag: 'span' })
</script>

<template>
  <div class="flex h-16 items-center gap-2 border-b border-neutral-4 px-3 lg:h-18 lg:pr-4 lg:pl-6">
    <UiIcon v-if="icon" :name="icon" :size="20" class="mr-1 shrink-0 text-neutral-13 lg:!size-6" :class="lgTitle && 'max-lg:hidden'" />
    <component :is="tag" v-if="title" class="type-14 lg:type-16-medium mr-1 whitespace-nowrap" :class="lgTitle && 'max-lg:hidden'">{{ title }}</component>
    <slot />
  </div>
</template>
