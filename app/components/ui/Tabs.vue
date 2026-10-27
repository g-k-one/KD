<script setup lang="ts" generic="T extends string">
// Figma "Tab": caps label, active = white with a brand underline. The underline slides between tabs.
const model = defineModel<T>({ required: true })
const sfx = useSfx()
function choose(v: T) {
  if (v !== model.value) sfx.tap()
  model.value = v
}
/** flush: no bottom rule of its own (the parent draws it, e.g. with controls on the same line) */
defineProps<{ tabs: Array<{ value: T; label: string; count?: number }>; flush?: boolean }>()

const root = useTemplateRef<HTMLElement>('root')
const bar = reactive({ x: 0, w: 0 })

function measure() {
  const el = root.value?.querySelector<HTMLElement>('[aria-selected="true"]')
  if (!el) return
  bar.x = el.offsetLeft
  bar.w = el.offsetWidth
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}
watch(model, () => nextTick(measure))
onMounted(() => nextTick(measure))
useResizeObserver(root, measure)
</script>

<template>
  <div ref="root" role="tablist" class="scrollbar-none relative flex gap-6 overflow-x-auto" :class="!flush && 'border-b border-neutral-4'">
    <button
      v-for="t in tabs"
      :key="t.value"
      type="button"
      role="tab"
      :aria-selected="model === t.value"
      class="type-14-caps flex h-12 shrink-0 items-center gap-2 transition-colors duration-200"
      :class="model === t.value ? 'text-neutral-15' : 'text-neutral-12 hover:text-neutral-15'"
      @click="choose(t.value)"
    >
      {{ t.label }}
      <span v-if="t.count != null" class="type-12 rounded-md bg-neutral-6 px-1.5 py-0.5 text-neutral-13">{{ t.count }}</span>
    </button>
    <span
      class="kd-tab-bar bg-brand-gradient pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full"
      :style="{ transform: `translateX(${bar.x}px)`, width: `${bar.w}px` }"
    />
  </div>
</template>

<style scoped>
.kd-tab-bar {
  transition:
    transform var(--dur-slow) var(--ease-out),
    width var(--dur-slow) var(--ease-out);
}
</style>
