<script setup lang="ts">
// A time-limited case: the clock to its real end on a plate ("11D 12:45:00"), the last day hotter, then a cold "Ended".
const props = defineProps<{ endsAt: string }>()
const clock = useClock(1000)
const left = computed(() => Date.parse(props.endsAt) - clock.value)
</script>

<template>
  <span class="kd-ends type-12-caps inline-flex h-6 items-center rounded-md px-2 whitespace-nowrap tabular-nums" :class="left <= 0 ? 'is-out' : left < 86_400_000 && 'is-low'">
    <!-- the server and the browser read the clock a moment apart -->
    <span data-allow-mismatch="text">{{ left <= 0 ? $t('cases.ended') : countdownDays(endsAt, clock) }}</span>
  </span>
</template>

<style scoped>
/* the stock plate's ember, unfilled: time has no share to show */
.kd-ends {
  min-width: 84px;
  justify-content: center;
  color: var(--color-neutral-15);
  text-shadow: 0 1px 0 rgb(0 0 0 / 0.45);
  background: #3b1309;
  box-shadow:
    inset 0 0 0 1px rgb(var(--brand-rgb) / 0.6),
    0 0 12px rgb(var(--brand-rgb) / 0.4);
}
.kd-ends.is-low {
  box-shadow:
    inset 0 0 0 1px rgb(255 177 59 / 0.85),
    0 0 18px rgb(var(--brand-rgb) / 0.65);
}
.kd-ends.is-out {
  color: var(--color-neutral-11);
  text-shadow: none;
  background: rgb(var(--dark-rgb) / 0.82);
  box-shadow: inset 0 0 0 1px var(--color-neutral-6);
}
</style>
