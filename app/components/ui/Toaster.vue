<script setup lang="ts">
const { toasts } = useToast()
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-[calc(68px+env(safe-area-inset-top))] z-[70] flex flex-col items-center gap-2 px-4 lg:top-20 lg:right-6 lg:left-auto lg:items-end"
    aria-live="polite"
  >
    <TransitionGroup name="kd-toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="type-14 pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl border px-4 py-3 shadow-elevation-2"
        :class="{
          'border-neutral-5 bg-neutral-3 text-neutral-15': t.tone === 'default',
          'border-success bg-[#0f2a1e] text-neutral-15': t.tone === 'success',
          'border-danger bg-[#2c1413] text-neutral-15': t.tone === 'danger',
        }"
      >
        <UiIcon v-if="t.tone === 'success'" name="check-circle" :size="20" class="text-success" />
        <UiIcon v-else-if="t.tone === 'danger'" name="info" :size="20" class="text-danger" />
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.kd-toast-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-toast-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
/* Toasts drop in from the header (top centre on phones, top right on desktop), clear of the game controls */
.kd-toast-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}
.kd-toast-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.kd-toast-move {
  transition: transform var(--dur-base) var(--ease-out);
}
</style>
