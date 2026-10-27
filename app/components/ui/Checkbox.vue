<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
const sfx = useSfx()
</script>

<template>
  <label class="group type-14-regular flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg py-3 pr-6 pl-3 text-neutral-15 transition-colors hover:bg-white-4">
    <input v-model="model" type="checkbox" class="peer sr-only" @change="sfx.tap()" />
    <span
      class="kd-check mt-px grid size-[18px] shrink-0 place-items-center rounded-sm border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-light"
      :data-on="model || undefined"
    >
      <svg viewBox="0 0 16 16" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path class="kd-check-path" d="M3.5 8.5 6.5 11.5 12.5 4.5" />
      </svg>
    </span>
    <span><slot /></span>
  </label>
</template>

<style scoped>
.kd-check {
  border-color: var(--color-neutral-8);
  color: var(--color-neutral-1);
  transition:
    background-color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}
.group:active .kd-check {
  transform: scale(0.9);
}
.kd-check[data-on] {
  background: var(--color-brand-base);
  border-color: var(--color-brand-base);
}
/* The tick draws itself in instead of popping. */
.kd-check-path {
  stroke-dasharray: 14;
  stroke-dashoffset: 14;
  transition: stroke-dashoffset var(--dur-slow) var(--ease-out);
}
.kd-check[data-on] .kd-check-path {
  stroke-dashoffset: 0;
}
</style>
