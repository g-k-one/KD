<script setup lang="ts">
import type { HomeLayout } from '#shared/types/api'

// Editing the home layout (prototype): a hidden row keeps its place as a slim plate, so it comes back where it was
defineProps<{ row: HomeLayout['sections'][number] }>()
const { patchRow } = useHomeLayout()
</script>

<template>
  <div class="kd-hidden-row flex h-14 items-center gap-3 rounded-4xl pr-3 pl-4">
    <UiIcon name="eye-slash" :size="18" class="text-neutral-11" />
    <span class="type-16-caps flex-1 truncate text-neutral-11">{{ row.title }}</span>
    <span class="type-12 text-neutral-11 max-sm:hidden">Hidden from players</span>
    <UiButton size="s" variant="secondary" icon="eye" @click="patchRow(row.id, { hidden: false })">Show</UiButton>
  </div>
</template>

<style scoped>
.kd-hidden-row {
  background: var(--color-white-4);
  outline: 1px dashed var(--color-white-12);
  outline-offset: -1px;
}
</style>
