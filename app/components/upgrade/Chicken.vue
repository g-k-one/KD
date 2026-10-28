<script setup lang="ts">
/*
 * The meme chicken on the upgrade dial, for close calls only (presentation, it never changes a chance):
 *   nearWin  — won by a hair: peeks out, relieved ("By a feather!" + the margin)
 *   nearLose — missed by a hair: peeks out and teases ("LOL, not this time")
 * The line is picked at random from a short set so it does not repeat every time.
 */
const props = defineProps<{ mood: 'nearWin' | 'nearLose' | null; margin?: number }>()
const { tm, rt } = useI18n()
const line = ref('')
watch(
  () => props.mood,
  (m) => {
    if (!m) return
    const lines = tm(`upgrade.chicken.${m}`) as unknown as string[]
    const pick = lines[Math.floor(Math.random() * lines.length)]
    line.value = pick ? rt(pick as never) : ''
  },
  { immediate: true },
)
</script>

<template>
  <Transition name="kd-chick">
    <span v-if="mood" class="kd-chick-wrap pointer-events-none absolute left-1/2 z-[4] flex flex-col items-center" :class="`is-${mood}`">
      <span class="kd-bubble type-12-caps whitespace-nowrap rounded-xl px-2.5 py-1" :class="mood === 'nearLose' ? 'is-tease' : 'is-phew'">
        {{ line }}<template v-if="margin != null"> · {{ margin.toFixed(2) }}</template>
      </span>
      <!-- two meme frames (public/img/moods): laughing at a near miss, wiping its brow on a near win -->
      <span class="kd-chick kd-chick-meme block size-24 lg:size-28" :class="mood === 'nearLose' ? 'is-lol' : 'is-phew'" aria-hidden="true" />
    </span>
  </Transition>
</template>

<style scoped>
/* peeks out from under the dial's bottom edge, most of the body hidden */
.kd-chick-wrap {
  bottom: -56px;
  translate: -50% 0;
}
.kd-chick {
  filter: drop-shadow(0 8px 18px rgb(228 174 57 / 0.55));
  transform-origin: 50% 100%;
}
.kd-chick-meme {
  background: url('/img/moods/near-lose.webp') no-repeat 50% 0 / contain;
  filter: drop-shadow(0 8px 16px rgb(0 0 0 / 0.5));
}
.kd-chick-meme.is-phew {
  background-image: url('/img/moods/near-win.webp');
}
.is-nearWin .kd-chick {
  animation: kd-chick-phew 1.2s var(--ease-in-out) infinite;
}
.is-nearLose .kd-chick {
  animation: kd-chick-laugh 420ms var(--ease-in-out) 4;
}
@keyframes kd-chick-phew {
  50% {
    translate: 0 -4px;
    rotate: 3deg;
  }
}
@keyframes kd-chick-laugh {
  50% {
    rotate: -8deg;
    scale: 1.04 0.96;
  }
}
.kd-bubble {
  margin-bottom: -6px;
  animation: kd-bubble-in 420ms var(--ease-spring) 260ms both;
}
.kd-bubble.is-phew {
  background: linear-gradient(90deg, var(--color-gold), var(--color-gold-light), var(--color-item-gold));
  color: var(--color-neutral-1);
}
.kd-bubble.is-tease {
  background: var(--color-neutral-15);
  color: var(--color-neutral-1);
}
@keyframes kd-bubble-in {
  0% {
    opacity: 0;
    scale: 0.4;
    translate: 0 8px;
  }
}
.kd-chick-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    translate 600ms var(--ease-spring);
}
.kd-chick-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-in),
    translate var(--dur-base) var(--ease-in);
}
.kd-chick-enter-from {
  opacity: 0;
  translate: -50% 70px;
}
.kd-chick-leave-to {
  opacity: 0;
  translate: -50% 40px;
}
</style>
