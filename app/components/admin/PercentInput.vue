<script setup lang="ts">
// UiInput for a share the API keeps in whole units: basis points (per1 = 100, 92.40%) or odds tickets out of
// 1 000 000 (per1 = 10 000, 0.0015%). Shows percent, stores units.
const units = defineModel<number>({ required: true })
const props = withDefaults(defineProps<{ per1?: number; size?: 's' | 'm'; disabled?: boolean }>(), { per1: 100, size: 'm' })
const digits = computed(() => Math.round(Math.log10(props.per1)))
const pct = computed({
  get: () => +(units.value / props.per1).toFixed(digits.value),
  set: (v: number) => (units.value = Math.max(0, Math.round(v * props.per1))),
})
</script>

<template>
  <UiInput v-model.number="pct" :size="size" :disabled="disabled" lazy align="right" inputmode="decimal">
    <template #trailing><span class="type-14 shrink-0 text-neutral-11">%</span></template>
  </UiInput>
</template>
