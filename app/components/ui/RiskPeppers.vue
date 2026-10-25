<script lang="ts">
// One observer for every set of peppers on the page (a home page holds dozens): the hot ones flicker only while on
// screen, so cards scrolled away hold no running animations and no extra layers
const seen = new WeakMap<Element, (on: boolean) => void>()
let io: IntersectionObserver | null = null
const watchSeen = (el: Element, cb: (on: boolean) => void) => {
  io ??= new IntersectionObserver((entries) => entries.forEach((e) => seen.get(e.target)?.(e.isIntersecting)))
  seen.set(el, cb)
  io.observe(el)
  return () => {
    io?.unobserve(el)
    seen.delete(el)
  }
}
</script>

<script setup lang="ts">
import type { RiskLevel } from '#shared/types/api'

// Risk as chili peppers (case page only): 1 low … 4 extreme. Vector, so the lit colour follows the level
// through --pepper (green → yellow → orange → red); unlit peppers stay dark.
const props = withDefaults(defineProps<{ level: RiskLevel; size?: number }>(), { size: 18 })
const LIT: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3, extreme: 4 }
const lit = computed(() => LIT[props.level])
const root = useTemplateRef<HTMLElement>('root')
const onScreen = ref(false)
let stop: (() => void) | undefined
onMounted(() => root.value && (stop = watchSeen(root.value, (on) => (onScreen.value = on))))
onBeforeUnmount(() => stop?.())
</script>

<template>
  <span ref="root" class="kd-peppers inline-flex items-end gap-0.5" :class="[`is-${level}`, onScreen && 'is-on']" role="img" :aria-label="$t(`risk.${level}`)">
    <svg
      v-for="n in 4"
      :key="n"
      viewBox="0 0 24 24"
      :width="size"
      :height="size"
      class="kd-pepper"
      :class="n <= lit && 'is-lit'"
      :style="{ '--i': n }"
      aria-hidden="true"
    >
      <path d="M14.6 4.2c.4-1.4 1.6-2.2 2.9-2.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none" class="kd-stem" />
      <path d="M12.6 5.4c1.6-1.3 4.4-.9 5.4 1.1.9 1.7.2 3.6-.7 5.4-1.8 3.6-5 7.4-9.6 9.6-1.3.6-2.8.3-3-.4-.2-.6.6-1.2 1.5-1.9 2.5-2 3.6-4.5 4.2-7.2.5-2.6.6-5.2 2.2-6.6z" class="kd-body" />
      <path d="M15.6 7.3c.9.4 1.2 1.3.9 2.2" stroke="#fff" stroke-opacity=".45" stroke-width="1.2" stroke-linecap="round" fill="none" class="kd-shine-line" />
    </svg>
  </span>
</template>

<style scoped>
.kd-pepper {
  color: var(--color-neutral-8);
}
.kd-pepper .kd-body {
  fill: var(--color-neutral-6);
}
.kd-pepper .kd-shine-line {
  display: none;
}
.kd-peppers.is-low {
  --pepper: var(--color-success);
}
.kd-peppers.is-medium {
  --pepper: var(--color-coin);
}
.kd-peppers.is-high {
  --pepper: var(--color-brand-light);
}
.kd-peppers.is-extreme {
  --pepper: var(--color-danger);
}
.kd-pepper.is-lit {
  color: color-mix(in srgb, var(--pepper) 55%, #3fae5a);
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--pepper) 60%, transparent));
}
.kd-pepper.is-lit .kd-body {
  fill: var(--pepper);
}
.kd-pepper.is-lit .kd-shine-line {
  display: inline;
}
/* the hotter the case, the more the peppers flicker (while on screen) */
.is-high .kd-pepper.is-lit,
.is-extreme .kd-pepper.is-lit {
  /* a fixed glow; only the wiggle animates (transform), so nothing repaints per frame */
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--pepper) 70%, transparent));
}
.is-high.is-on .kd-pepper.is-lit,
.is-extreme.is-on .kd-pepper.is-lit {
  animation: kd-pepper-heat 1.6s ease-in-out infinite;
  animation-delay: calc(var(--i) * 120ms);
}
@keyframes kd-pepper-heat {
  50% {
    transform: translateY(-1px) rotate(-4deg);
  }
}
</style>
