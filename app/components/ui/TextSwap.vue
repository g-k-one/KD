<script setup lang="ts">
/*
 * Animated label change (docs/motion.md → "Text swap").
 * The old text lifts away and blurs out as a whole (110ms), then the new one rises in letter by letter,
 * each letter 14ms after the previous, out of a light blur — one word at a time, so quick changes never
 * stack up. An invisible copy of the current text holds the box at its width and the box glides to the
 * new width, so whatever sits next to the label (a price in a button) slides instead of jumping.
 * Same text = no animation. Screen readers get the plain text once; the letters are presentation only.
 */
const props = defineProps<{ text: string }>()
const letters = computed(() => Array.from(props.text))

const root = useTemplateRef<HTMLElement>('root')
const sizer = useTemplateRef<HTMLElement>('sizer')
watch(
  () => props.text,
  async () => {
    const el = root.value
    if (!el || !el.isConnected) return
    const from = el.getBoundingClientRect().width
    await nextTick()
    const to = sizer.value?.getBoundingClientRect().width ?? from
    if (Math.abs(to - from) < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.animate([{ width: `${from}px` }, { width: `${to}px` }], { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
  },
  { flush: 'pre' },
)
</script>

<template>
  <span ref="root" class="kd-swap relative inline-grid">
    <!-- invisible copy of the current text: the box's resting width -->
    <span ref="sizer" class="invisible col-start-1 row-start-1 whitespace-pre" aria-hidden="true">{{ text }}</span>
    <Transition name="kd-swap" mode="out-in">
      <span :key="text" class="kd-swap-word col-start-1 row-start-1 whitespace-pre" :aria-label="text">
        <span v-for="(ch, i) in letters" :key="i" class="kd-swap-ch inline-block" :style="{ '--i': i }" aria-hidden="true">{{ ch }}</span>
      </span>
    </Transition>
  </span>
</template>

<style scoped>
/* The leaving word never spills sideways over its neighbours (a coin, a price): clip left and right only,
   so the letters can still rise and fall in and out vertically */
.kd-swap {
  clip-path: inset(-0.6em 0);
}
.kd-swap-enter-active .kd-swap-ch {
  animation: kd-swap-in 380ms var(--ease-out) both;
  animation-delay: calc(var(--i) * 14ms);
}
@keyframes kd-swap-in {
  from {
    opacity: 0;
    transform: translateY(0.55em) scale(0.92);
    filter: blur(4px);
  }
}
.kd-swap-leave-active {
  pointer-events: none;
  transition:
    opacity 110ms var(--ease-in),
    transform 110ms var(--ease-in),
    filter 110ms var(--ease-in);
}
.kd-swap-leave-to {
  opacity: 0;
  transform: translateY(-0.4em);
  filter: blur(3px);
}
@media (prefers-reduced-motion: reduce) {
  .kd-swap-enter-active .kd-swap-ch {
    animation-duration: 1ms;
    animation-delay: 0ms;
  }
}
</style>
