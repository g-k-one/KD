<script setup lang="ts">
/*
 * Balance coins as a piece of the stake, drawn like a skin: one picture per order of the amount, so it reads at a
 * glance how much is in — a coin (under 10), a pile (under 100), a sack (under 1 000), crates (under 10 000), a van
 * (under 100 000), a container (beyond). A soft gold glow sits behind it; moving to another tier pops the new picture
 * in. Size is the old coin diameter: the picture box is 1.9× it, the same footprint as a skin next to it.
 */
const props = withDefaults(defineProps<{ size?: number; amount?: number }>(), { size: 40 })

const TIERS = ['coin', 'pile', 'sack', 'crates', 'van', 'container'] as const
const tier = computed(() => {
  const coins = Math.max(0, (props.amount ?? 0) / 100)
  return TIERS[Math.min(TIERS.length - 1, Math.max(0, Math.floor(Math.log10(Math.max(1, coins)))))]!
})
const box = computed(() => Math.round(props.size * 1.9))
</script>

<template>
  <span class="kd-stack relative inline-grid place-items-center" :style="{ width: `${box}px`, height: `${box}px` }" aria-hidden="true">
    <span class="kd-stack-glow pointer-events-none absolute inset-0 rounded-full" />
    <Transition name="kd-tier" mode="out-in">
      <img :key="tier" :src="`/img/coins/${tier}.webp`" alt="" class="kd-stack-img relative size-full object-contain" draggable="false" />
    </Transition>
  </span>
</template>

<style scoped>
.kd-stack-glow {
  background: radial-gradient(closest-side, rgb(255 166 43 / 0.32), transparent);
  scale: 1.1 0.9;
  translate: 0 8%;
}
.kd-stack-img {
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.45));
}
/* a new tier drops in with a bounce, the old one shrinks away */
.kd-tier-enter-active {
  transition:
    scale 420ms cubic-bezier(0.34, 1.56, 0.64, 1),
    translate 420ms cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 160ms var(--ease-out);
}
.kd-tier-enter-from {
  scale: 0.6;
  translate: 0 -12%;
  opacity: 0;
}
.kd-tier-leave-active {
  transition:
    scale 140ms var(--ease-in),
    opacity 140ms var(--ease-in);
}
.kd-tier-leave-to {
  scale: 0.8;
  opacity: 0;
}
</style>
