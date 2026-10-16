<script setup lang="ts">
const model = defineModel<number>({ required: true })
withDefaults(defineProps<{ min?: number; max?: number; label?: string; showValue?: boolean }>(), {
  min: 0,
  max: 100,
  showValue: true,
})
</script>

<template>
  <div class="flex h-5 w-full items-center gap-3">
    <input
      v-model.number="model"
      type="range"
      :min="min"
      :max="max"
      :aria-label="label"
      class="kd-slider h-1 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-7"
      :style="{ '--p': `${((model - min) / (max - min)) * 100}%` }"
      @click.stop
    />
    <span v-if="showValue" class="type-12-regular w-8 text-right text-neutral-12">{{ model }}%</span>
  </div>
</template>

<style scoped>
.kd-slider {
  background: linear-gradient(90deg, var(--color-brand-base), var(--color-brand-bright)) 0 / var(--p) 100% no-repeat,
    var(--color-neutral-7);
}
.kd-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: var(--color-neutral-15);
}
.kd-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: 0;
  border-radius: 9999px;
  background: var(--color-neutral-15);
}
</style>
