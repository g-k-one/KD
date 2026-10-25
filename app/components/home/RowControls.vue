<script setup lang="ts">
import type { SectionTheme } from '#shared/types/api'

// Editing the home layout (prototype): on a row's header — its scene, its place among the rows, hide it.
const props = defineProps<{ id: string }>()
const { layout, patchRow, moveRow, rowPlace } = useHomeLayout()

const row = computed(() => layout.value?.sections.find((r) => r.id === props.id))
const place = computed(() => rowPlace(props.id))
const theme = computed({
  get: () => row.value?.theme ?? 'none',
  set: (t: SectionTheme | 'none') => patchRow(props.id, { theme: t === 'none' ? null : t }),
})
const THEMES = [
  { value: 'none' as const, label: 'No scene', title: 'Plain row' },
  { value: 'coop' as const, label: 'Coop', title: 'Chicken coop: cards sit in nests' },
]
</script>

<template>
  <div v-if="row" class="flex shrink-0 items-center gap-1">
    <UiSegmented v-model="theme" size="s" :options="THEMES" class="mr-1" />
    <UiButton size="s" variant="secondary" icon="chevron-up" icon-only title="Move up" :disabled="place.first" @click="moveRow(id, -1)" />
    <UiButton size="s" variant="secondary" icon="chevron-down" icon-only title="Move down" :disabled="place.last" @click="moveRow(id, 1)" />
    <UiButton size="s" variant="secondary" icon="eye-slash" icon-only title="Hide row" @click="patchRow(id, { hidden: true })" />
  </div>
</template>
