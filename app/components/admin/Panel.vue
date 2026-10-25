<script setup lang="ts">
// An admin panel: the profile page's plate (24px corners) with a header line. Body padding follows what sits in it,
// so corners stay concentric: `fields` 16px around m fields (8px), `list` 12px around 12px rows.
withDefaults(defineProps<{ title: string; icon?: string; hint?: string; body?: 'fields' | 'list' }>(), { body: 'fields' })
</script>

<template>
  <section class="flex min-w-0 flex-col rounded-5xl bg-neutral-2">
    <header class="flex min-h-14 items-center gap-3 border-b border-neutral-4 px-4 py-2 lg:min-h-16 lg:pr-4 lg:pl-6">
      <UiIcon v-if="icon" :name="icon" :size="24" class="shrink-0 text-neutral-13" />
      <div class="flex min-w-0 flex-1 flex-col">
        <h2 class="type-14-caps lg:type-16-caps truncate">{{ title }}</h2>
        <p v-if="hint" class="type-12-regular text-neutral-11">{{ hint }}</p>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-1">
        <slot name="actions" />
      </div>
    </header>
    <div class="flex flex-col" :class="body === 'list' ? 'gap-1 p-3' : 'gap-4 p-4'">
      <slot />
    </div>
  </section>
</template>
