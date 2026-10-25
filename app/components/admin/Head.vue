<script setup lang="ts">
// The title line of an admin section: loud caps title, one line of what it does, actions on the right
defineProps<{ title: string; hint?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-end gap-3 pb-4 lg:pb-6">
    <div class="flex min-w-[min(100%,240px)] flex-1 flex-col gap-1">
      <slot name="before" />
      <h1 class="type-20-caps truncate">{{ title }}</h1>
      <p v-if="hint" class="type-14-regular text-neutral-11">{{ hint }}</p>
    </div>
    <div v-if="$slots.default" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot />
    </div>
  </div>
</template>
