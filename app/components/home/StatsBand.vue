<script setup lang="ts">
import type { StatsResponse } from '#shared/types/api'

// Trust band (docs/ux-research-v3.md #8, D3): site-wide counters under the hero, Hellcase / Skin.Club style.
// Numbers run up once on mount, then cases opened keeps ticking between refreshes, so the site feels alive.
const { data, refresh } = useFetch<StatsResponse>('/api/stats', { key: 'stats', lazy: true, server: false })
useIntervalFn(() => refresh(), 30_000)

const shown = reactive({ casesOpened: 0, upgrades: 0, battles: 0, online: 0 })
const extra = ref(0)
let raf = 0
watch(
  data,
  (d, old) => {
    if (!d) return
    extra.value = 0
    cancelAnimationFrame(raf)
    if (old || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Object.assign(shown, d)
    const from = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - from) / 1200)
      const k = 1 - (1 - p) ** 3
      for (const key of Object.keys(shown) as (keyof StatsResponse)[]) shown[key] = Math.round(d[key] * k)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  },
  { immediate: true },
)
// a few opens land every couple of seconds
useIntervalFn(() => data.value && (extra.value += 1 + Math.floor(Math.random() * 4)), 2_400)
onBeforeUnmount(() => cancelAnimationFrame(raf))

const cells = computed(() => [
  { key: 'casesOpened', value: shown.casesOpened + (shown.casesOpened ? extra.value : 0) },
  { key: 'upgrades', value: shown.upgrades },
  { key: 'battles', value: shown.battles },
  { key: 'online', value: shown.online, live: true },
])
</script>

<template>
  <!-- concentric corners: 12px cells + 4px padding = 16px (rounded-3xl) -->
  <div class="grid grid-cols-4 gap-1 rounded-3xl bg-neutral-2 p-1">
    <div v-for="c in cells" :key="c.key" class="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 lg:py-3">
      <span class="type-16-caps lg:type-20-caps flex items-center gap-1.5 tabular-nums">
        <span v-if="c.live" class="kd-live-dot size-1.5 shrink-0 rounded-full bg-success" />
        <!-- phones: 4.14M, so four counters fit one row -->
        <span class="lg:hidden">{{ shortCount(c.value) }}</span>
        <span class="max-lg:hidden">{{ formatCount(c.value) }}</span>
      </span>
      <span class="type-10-caps max-w-full truncate text-neutral-11">{{ $t(`cases.stats.${c.key}`) }}</span>
    </div>
  </div>
</template>

<style scoped>
.kd-live-dot {
  box-shadow: 0 0 0 0 rgb(18 183 106 / 0.6);
  animation: kd-live 1.8s var(--ease-out) infinite;
}
@keyframes kd-live {
  70%,
  100% {
    box-shadow: 0 0 0 6px rgb(18 183 106 / 0);
  }
}
</style>
