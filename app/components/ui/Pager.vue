<script setup lang="ts">
// Prev · "3 / 12" · next. The page is 0-based; the label shows it 1-based.
const page = defineModel<number>({ required: true })
defineProps<{ pages: number }>()
</script>

<template>
  <div class="flex items-center justify-center gap-4">
    <UiButton variant="ghost" size="s" icon="chevron-left" icon-only :disabled="page <= 0" :aria-label="$t('common.prev')" @click="page--" />
    <span class="type-12 min-w-12 text-center text-neutral-11 tabular-nums">{{ page + 1 }} / {{ pages }}</span>
    <UiButton variant="ghost" size="s" icon="chevron-right" icon-only :disabled="page >= pages - 1" :aria-label="$t('common.next')" @click="page++" />
  </div>
</template>
