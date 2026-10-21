<script setup lang="ts">
/*
 * Header balance. When it grows (sale, upgrade win, deposit, PvP prize) the number counts up,
 * a "+N" pops above it and the pill glows — Key-Drop's "credit-pop" + "balance-glow".
 * Spending just counts down quietly.
 */
const session = useSessionStore()
const sfx = useSfx()

const balance = computed(() => session.user?.balance ?? 0)
const shown = useTransition(balance, { duration: 650, transition: [0.22, 1, 0.36, 1] })

const root = useTemplateRef<HTMLElement>('root')
const pops = ref<{ id: number; amount: number }[]>([])
const glow = ref(false)
let seq = 0
let glowTimer: ReturnType<typeof setTimeout> | undefined

watch(balance, (now, before) => {
  if (!import.meta.client || before == null || now <= before) return
  const id = ++seq
  pops.value.push({ id, amount: now - before })
  setTimeout(() => (pops.value = pops.value.filter((p) => p.id !== id)), 1600)
  glow.value = false
  clearTimeout(glowTimer)
  setTimeout(() => (glow.value = true), 20)
  glowTimer = setTimeout(() => (glow.value = false), 1200)
  // Desktop and mobile headers both mount this; only the visible one makes a sound
  if (root.value?.offsetParent) sfx.coin()
})
</script>

<template>
  <span ref="root" class="kd-balance relative inline-flex rounded-md" :class="glow && 'is-glowing'">
    <UiPrice :amount="Math.round(shown)" size="m" />
    <span
      v-for="p in pops"
      :key="p.id"
      class="kd-credit type-12 pointer-events-none absolute top-full left-1/2 z-50 mt-2 rounded-md border border-success bg-neutral-3 px-1.5 py-0.5 whitespace-nowrap text-success"
    >
      +{{ formatCoins(p.amount) }}
    </span>
  </span>
</template>

<style scoped>
.kd-balance.is-glowing {
  animation: kd-balance-glow 1.2s var(--ease-out);
}
@keyframes kd-balance-glow {
  25% {
    box-shadow: 0 0 18px 4px rgb(18 183 106 / 0.55);
    background: rgb(18 183 106 / 0.12);
  }
}
.kd-credit {
  animation: kd-credit-pop 1.6s var(--ease-out) both;
}
@keyframes kd-credit-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, 6px) scale(0.6);
  }
  12% {
    opacity: 1;
    transform: translate(-50%, -2px) scale(1.1);
  }
  20% {
    transform: translate(-50%, -2px) scale(1);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -14px) scale(1);
  }
}
</style>
