<script setup lang="ts">
// Inline SVG icons from app/assets/icons. Colors use currentColor, so set them with text-* classes.
const icons = import.meta.glob('~/assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const byName: Record<string, string> = {}
for (const [path, svg] of Object.entries(icons)) {
  byName[path.split('/').pop()!.replace('.svg', '')] = svg
}

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })

const svg = computed(() => {
  const raw = byName[props.name]
  if (!raw && import.meta.dev) console.warn(`[UiIcon] unknown icon "${props.name}"`)
  return raw ?? ''
})
</script>

<template>
  <span
    class="inline-flex shrink-0 [&>svg]:size-full"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
    v-html="svg"
  />
</template>
