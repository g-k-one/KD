<script setup lang="ts">
/*
 * Layered reveal effect, scaled by tier (see RARITY_TIER):
 *   1 flash · 2 + soft aura · 3+ spark particles. No hard rings: the crisp spark rings come from Forge (kdReveal).
 * Rays and the lasting glow behind rare drops come from Forge (kdAura), which draws them soft.
 * Pure CSS on a handful of elements, plays once on mount. Sits centred over its parent.
 */
const props = withDefaults(defineProps<{ tier: number; color: string; size?: number }>(), { size: 160 })

// Particle directions are random per reveal, so they are drawn only once mounted (a server render would not match)
const mounted = useMounted()
const sparks = computed(() => {
  if (!mounted.value) return []
  const n = props.tier >= 4 ? 30 : props.tier >= 3 ? 20 : props.tier >= 2 ? 10 : 0
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4
    const d = props.size * (0.55 + Math.random() * 0.45)
    return {
      '--x': `${Math.cos(a) * d}px`,
      '--y': `${Math.sin(a) * d}px`,
      '--s': `${3 + Math.random() * 4}px`,
      '--delay': `${Math.random() * 120}ms`,
    }
  })
})
</script>

<template>
  <span class="kd-burst pointer-events-none absolute top-1/2 left-1/2" :style="{ '--c': color, '--size': `${size}px` }" aria-hidden="true">
    <span class="kd-burst-aura" />
    <span class="kd-burst-flash" />
    <span v-for="(s, i) in sparks" :key="i" class="kd-burst-spark" :style="s" />
  </span>
</template>

<style scoped>
.kd-burst {
  width: 0;
  height: 0;
  z-index: 0;
}
.kd-burst > span {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 9999px;
}
/* Key-Drop "flash-in": a bright bloom that settles */
.kd-burst-flash {
  width: var(--size);
  height: var(--size);
  margin: calc(var(--size) / -2);
  background: radial-gradient(circle, #fff 0%, color-mix(in srgb, var(--c) 75%, white) 18%, color-mix(in srgb, var(--c) 55%, transparent) 42%, transparent 70%);
  animation: kd-flash 1100ms var(--ease-out) both;
}
@keyframes kd-flash {
  0% {
    opacity: 0;
    transform: scale(0.3);
    filter: brightness(2.5);
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
    filter: brightness(1);
  }
}
/* Hellcase "hexRing / hexWave": a thin ring that expands and fades */
/* A soft rarity glow stays behind the drop after the burst, so the result never looks dull */
.kd-burst-aura {
  width: calc(var(--size) * 1.1);
  height: calc(var(--size) * 1.1);
  margin: calc(var(--size) * -0.55);
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 55%, transparent), transparent 68%);
  animation:
    kd-aura-in 700ms var(--ease-out) both,
    kd-aura-breathe 2.4s ease-in-out 700ms infinite;
}
@keyframes kd-aura-in {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
}
@keyframes kd-aura-breathe {
  50% {
    opacity: 0.65;
    transform: scale(0.92);
  }
}
/* Sparks fly out along random directions and shrink away */
.kd-burst-spark {
  width: var(--s);
  height: var(--s);
  margin: calc(var(--s) / -2);
  background: color-mix(in srgb, var(--c) 60%, white);
  box-shadow: 0 0 8px var(--c);
  animation: kd-spark 900ms var(--ease-out) var(--delay) both;
}
@keyframes kd-spark {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--x), var(--y)) scale(0.2);
  }
}
</style>
