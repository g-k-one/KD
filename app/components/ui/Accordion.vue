<script setup lang="ts">
// Figma "Accordion": question row with chevron; answer expands with a height animation.
const props = defineProps<{ title: string; defaultOpen?: boolean }>()
const open = ref(!!props.defaultOpen)
const id = useId()
</script>

<template>
  <div class="kd-panel transition-colors duration-200" :class="open && 'bg-neutral-3'">
    <button
      type="button"
      class="type-14 flex min-h-14 w-full items-center gap-4 px-4 text-left hover:text-neutral-15"
      :aria-expanded="open"
      :aria-controls="id"
      @click="open = !open"
    >
      <span class="flex-1">{{ title }}</span>
      <UiIcon name="chevron-down" :size="20" class="shrink-0 text-neutral-12 transition-transform duration-300 ease-[var(--ease-spring)]" :class="open && 'rotate-180'" />
    </button>
    <div :id="id" class="kd-acc grid" :data-open="open || undefined">
      <div class="overflow-hidden">
        <p class="type-14-regular px-4 pb-4 text-neutral-12">
          <slot />
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* grid-template-rows 0fr → 1fr animates to the content's real height */
.kd-acc {
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows var(--dur-slow) var(--ease-out),
    opacity var(--dur-base) var(--ease-out);
}
.kd-acc[data-open] {
  grid-template-rows: 1fr;
  opacity: 1;
}
</style>
