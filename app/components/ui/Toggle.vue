<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
defineProps<{ label?: string; disabled?: boolean }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="label"
    :disabled="disabled"
    class="kd-toggle group relative h-5 w-9 shrink-0 rounded-full disabled:opacity-40"
    :data-on="model || undefined"
    @click.stop="model = !model"
  >
    <span class="kd-toggle-knob absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-neutral-15 shadow-sm" />
  </button>
</template>

<style scoped>
.kd-toggle {
  background: var(--color-neutral-7);
  transition: background-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
}
.kd-toggle[data-on] {
  background: linear-gradient(90deg, var(--color-brand-base), var(--color-brand-bright));
  box-shadow: 0 0 12px -2px rgb(255 125 32 / 0.5);
}
/* Knob travels with a spring and stretches while pressed, like a physical switch. */
.kd-toggle-knob {
  transform-origin: left;
  transition:
    transform var(--dur-slow) var(--ease-spring),
    scale var(--dur-base) var(--ease-out);
}
.kd-toggle[data-on] .kd-toggle-knob {
  transform: translateX(16px);
  transform-origin: right;
}
.kd-toggle:active .kd-toggle-knob {
  scale: 1.25 1;
}
</style>
