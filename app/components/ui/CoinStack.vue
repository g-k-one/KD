<script setup lang="ts">
// Balance coins as a piece of the stake: a small stack of KD coins (the brand coin, not a bag), the top one
// tilted. Size is the coin diameter; the stack gets a touch taller for bigger amounts.
const props = withDefaults(defineProps<{ size?: number; amount?: number }>(), { size: 40 })
const count = computed(() => (!props.amount ? 3 : props.amount >= 100_000 ? 5 : props.amount >= 10_000 ? 4 : 3))
</script>

<template>
  <span class="kd-stack relative inline-block" :style="{ width: `${size * 1.3}px`, height: `${size * (0.9 + count * 0.16)}px`, '--c': `${size}px` }" aria-hidden="true">
    <span v-for="i in count" :key="i" class="kd-stack-coin absolute left-1/2" :style="{ bottom: `${(i - 1) * size * 0.16}px`, '--i': i }">
      <UiCoin :size="size" />
    </span>
  </span>
</template>

<style scoped>
.kd-stack-coin {
  translate: -50% 0;
  scale: 1 0.42;
  transform-origin: bottom;
  filter: drop-shadow(0 2px 0 rgb(120 70 0 / 0.9));
}
/* the top coin faces the viewer */
.kd-stack-coin:last-child {
  scale: 1;
  translate: calc(-50% + var(--c) * 0.08) calc(var(--c) * -0.2);
  rotate: 8deg;
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.45));
}
</style>
