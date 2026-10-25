<script setup lang="ts">
// UiInput for an amount the API keeps in coin cents: shows coins (0.99), stores cents (99)
const cents = defineModel<number>({ required: true })
withDefaults(defineProps<{ size?: 's' | 'm'; disabled?: boolean }>(), { size: 'm' })
const coins = computed({
  get: () => +(cents.value / 100).toFixed(2),
  set: (v: number) => (cents.value = Math.max(0, Math.round(v * 100))),
})
</script>

<template>
  <UiInput v-model.number="coins" :size="size" :disabled="disabled" coin lazy align="right" inputmode="decimal" />
</template>
