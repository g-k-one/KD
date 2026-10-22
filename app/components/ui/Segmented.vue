<script setup lang="ts" generic="T extends string | number">
/*
 * Segmented control: one pill, a thumb that slides to the chosen option. Used for the case amount (×1…×5),
 * the PvP tiles / lines view, and anywhere else a short set of exclusive options lives inline.
 * Concentric corners: the track is the thumb radius + its 4px padding.
 */
const model = defineModel<T>({ required: true })
const props = withDefaults(
  defineProps<{
    options: Array<{ value: T; label?: string; icon?: string; title?: string }>
    size?: 's' | 'm'
    disabled?: boolean
    /** stretch the options across the full width */
    block?: boolean
  }>(),
  { size: 'm' },
)
const index = computed(() => Math.max(0, props.options.findIndex((o) => o.value === model.value)))
</script>

<template>
  <div
    class="kd-seg relative grid p-1"
    :class="[size === 'm' ? 'rounded-2xl' : 'rounded-xl', block ? 'w-full' : 'w-max', disabled && 'is-disabled']"
    role="radiogroup"
    :style="{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, '--n': index, '--count': options.length }"
  >
    <span class="kd-seg-thumb absolute inset-y-1 left-1" :class="size === 'm' ? 'rounded-lg' : 'rounded-md'" />
    <button
      v-for="o in options"
      :key="String(o.value)"
      type="button"
      role="radio"
      :aria-checked="model === o.value"
      :title="o.title"
      :disabled="disabled"
      class="kd-press relative z-[1] flex items-center justify-center gap-1.5 tabular-nums transition-colors"
      :class="[size === 'm' ? 'type-14 h-10 min-w-10 rounded-lg px-3' : 'type-12 h-8 min-w-8 rounded-md px-2', model === o.value ? 'text-neutral-15' : 'text-neutral-11 hover:text-neutral-15']"
      @click="model = o.value"
    >
      <UiIcon v-if="o.icon" :name="o.icon" :size="size === 'm' ? 18 : 16" />
      <span v-if="o.label">{{ o.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.kd-seg {
  background: var(--color-neutral-3);
}
.kd-seg.is-disabled {
  opacity: 0.5;
}
.kd-seg-thumb {
  width: calc((100% - 8px) / var(--count));
  background: var(--color-neutral-6);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08);
  translate: calc(var(--n) * 100%) 0;
  transition: translate var(--dur-base) var(--ease-spring);
}
</style>
