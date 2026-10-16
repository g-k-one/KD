<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
defineProps<{ label?: string }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="label"
    class="relative h-5 w-9 shrink-0 rounded-full transition-colors"
    :class="model ? 'bg-brand-gradient' : 'bg-neutral-7'"
    @click.stop="model = !model"
  >
    <span
      class="absolute top-0.5 left-0.5 size-4 rounded-full bg-neutral-15 shadow transition-transform"
      :class="model && 'translate-x-4'"
    />
  </button>
</template>
