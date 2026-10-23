<script setup lang="ts">
/*
 * Balance coins as a piece of the stake: piles of KD coins that grow with the amount. Every coin is pseudo-3D — the
 * face lying flat over a ridged gold edge — and the top coin of the tallest pile stands up and turns slowly, the
 * way Forge's coins spin (the face squeezes to its edge and back). More coins: up to 6 a pile, then a second and a
 * third pile (log scale: 1 coin → 1, 100 → 7, 1 000 → 11, 10 000 → 14, capped at 18). When the amount changes, new
 * coins drop onto the piles with a bounce and spare ones lift off. Size is the coin diameter.
 */
const props = withDefaults(defineProps<{ size?: number; amount?: number }>(), { size: 40 })

const PER_PILE = 6
const total = computed(() => {
  const coins = Math.max(0, (props.amount ?? 0) / 100)
  return props.amount ? Math.max(1, Math.min(18, Math.round(1 + Math.log10(coins + 1) * 3.2))) : 3
})
/** Coins per pile, the tallest in the middle */
const piles = computed(() => {
  const n = total.value
  const count = Math.min(3, Math.ceil(n / PER_PILE))
  if (count === 1) return [n]
  if (count === 2) return [Math.floor(n / 2), Math.ceil(n / 2)]
  const mid = Math.min(PER_PILE, Math.ceil(n / 3) + 1)
  const rest = n - mid
  return [Math.floor(rest / 2), mid, Math.ceil(rest / 2)]
})
const tallest = computed(() => piles.value.indexOf(Math.max(...piles.value)))
const step = computed(() => props.size * 0.13)
const height = computed(() => Math.max(...piles.value) * step.value + props.size * 0.95)
// the piles overlap a little, the side ones sit a touch lower and behind
const pileW = computed(() => props.size * 1.05)
const width = computed(() => pileW.value * piles.value.length - props.size * 0.25 * (piles.value.length - 1) + props.size * 0.3)
</script>

<template>
  <span class="kd-stack relative inline-block" :style="{ width: `${width}px`, height: `${height}px`, '--c': `${size}px`, '--step': `${step}px` }" aria-hidden="true">
    <span
      v-for="(n, p) in piles"
      :key="p"
      class="kd-pile absolute bottom-0"
      :style="{
        left: `${p * (pileW - size * 0.25) + size * 0.15}px`,
        width: `${size}px`,
        height: `${height}px`,
        zIndex: p === tallest ? 3 : 1,
        bottom: p === tallest ? '0px' : `${size * 0.02}px`,
      }"
    >
      <TransitionGroup name="kd-coin">
        <span
          v-for="i in n"
          :key="i"
          class="kd-c absolute left-0"
          :class="p === tallest && i === n && 'is-top'"
          :style="{ bottom: `${(i - 1) * step}px`, transitionDelay: `${(i - 1) * 35}ms`, '--i': i }"
        >
          <span class="kd-c-edge" />
          <UiCoin :size="size" class="kd-c-face" />
        </span>
      </TransitionGroup>
    </span>
  </span>
</template>

<style scoped>
.kd-c {
  width: var(--c);
  height: calc(var(--c) * 0.42 + var(--step));
}
/* the face lies flat on top of its edge */
.kd-c-face {
  position: absolute;
  left: 0;
  top: 0;
  scale: 1 0.42;
  transform-origin: top;
}
/* the edge: a ridged gold band under the face, rounded like the coin's rim seen from the side */
.kd-c-edge {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(var(--c) * 0.21);
  height: calc(var(--c) * 0.21 + var(--step));
  border-radius: 0 0 50% 50% / 0 0 100% 100%;
  background:
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.16) 0 2px, transparent 2px 5px),
    linear-gradient(90deg, #a35f00, #f5b52a 30%, #ffd66b 50%, #e09a1a 70%, #8a4d00);
  box-shadow: 0 2px 3px rgb(0 0 0 / 0.45);
}
/* the top coin stands up, tilted, and turns slowly (the face squeezes to its edge and back) */
.kd-c.is-top {
  height: var(--c);
  translate: calc(var(--c) * 0.06) calc(var(--c) * -0.12);
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.45));
}
.kd-c.is-top .kd-c-edge {
  display: none;
}
.kd-c.is-top .kd-c-face {
  scale: 1;
  rotate: 8deg;
  transform-origin: center;
  animation: kd-coin-turn 3.2s ease-in-out infinite;
}
@keyframes kd-coin-turn {
  0%,
  60%,
  100% {
    scale: 1 1;
  }
  75% {
    scale: 0.18 1;
    filter: brightness(1.3);
  }
  90% {
    scale: 1 1;
  }
}
/* new coins drop onto the pile with a bounce; spare ones lift off */
.kd-coin-enter-active {
  transition:
    translate 420ms cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 200ms var(--ease-out);
}
.kd-coin-enter-from {
  translate: 0 calc(var(--c) * -1.4);
  opacity: 0;
}
.kd-coin-leave-active {
  transition:
    translate 260ms var(--ease-in),
    opacity 260ms var(--ease-in);
}
.kd-coin-leave-to {
  translate: 0 calc(var(--c) * -0.8);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .kd-c.is-top .kd-c-face {
    animation: none;
  }
}
</style>
