<script setup lang="ts">
// What a modal holds: media, title, description, content, actions. UiModal puts it in its panel; a modal with several
// steps shows one of these at a time in one panel (the inventory: the list, Sell, Withdraw).
defineProps<{ title?: string; description?: string }>()
</script>

<template>
  <div class="flex flex-col gap-6">
    <slot name="media" />
    <div v-if="title || description" class="flex flex-col gap-6 text-center">
      <h2 v-if="title" class="type-20-caps">{{ title }}</h2>
      <p v-if="description" class="type-14-regular text-neutral-12">{{ description }}</p>
    </div>
    <slot />
    <div v-if="$slots.actions" class="flex flex-wrap gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
