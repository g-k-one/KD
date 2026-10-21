<script setup lang="ts">
import type { CaseDetails } from '#shared/types/api'

// Figma "TransparencyBlock": RTP + chances to hit <x1, x2+, x3+, x5+, x10+ of the price, plus risk.
const props = defineProps<{ data: CaseDetails }>()
const infoOpen = ref(false)

const pct = (bp: number) => `${(bp / 100).toFixed(1)}%`
/** "1 in 48" reads better than 2.1% for small chances */
const oneIn = (bp: number) => (bp > 0 ? `1 ${t('case.in')} ${Math.max(1, Math.round(10000 / bp)).toLocaleString('en-US').replace(/,/g, ' ')}` : '—')
const { t } = useI18n()
const rows = computed(() => [
  { key: 'below1x', label: '< x1', value: props.data.odds.below1x, color: 'var(--color-neutral-10)', muted: true },
  { key: 'x2', label: 'x2+', value: props.data.odds.x2, color: 'var(--color-success)' },
  { key: 'x3', label: 'x3+', value: props.data.odds.x3, color: 'var(--color-coin)' },
  { key: 'x5', label: 'x5+', value: props.data.odds.x5, color: 'var(--color-brand-light)' },
  { key: 'x10', label: 'x10+', value: props.data.odds.x10, color: 'var(--color-item-covert)' },
])

// Bars grow in once the block is on screen
const root = useTemplateRef<HTMLElement>('root')
const shown = ref(false)
useIntersectionObserver(root, ([e]) => e?.isIntersecting && (shown.value = true), { threshold: 0.3 })

const RISK_TEXT = { low: 'text-success', medium: 'text-coin', high: 'text-brand-light', extreme: 'text-danger' } as const
</script>

<template>
  <div
    ref="root"
    class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 rounded-3xl border border-neutral-4 bg-neutral-2 px-4 py-3 lg:flex lg:gap-12 lg:py-[5px]"
  >
    <div class="relative order-1 flex items-center gap-2 lg:gap-3">
      <span class="text-xl leading-7 font-bold text-neutral-11 lg:type-28">{{ $t('case.rtp') }}</span>
      <span class="bg-brand-gradient bg-clip-text text-xl leading-7 font-bold text-transparent tabular-nums lg:type-28">{{ pct(data.rtp) }}</span>
      <button
        type="button"
        class="kd-press grid size-8 place-items-center rounded-xl text-neutral-12 hover:bg-white-4 hover:text-neutral-15 lg:size-12"
        :aria-label="$t('case.rtpInfo')"
        :aria-expanded="infoOpen"
        @click="infoOpen = !infoOpen"
      >
        <UiIcon name="info" :size="20" />
      </button>
      <Transition name="kd-tip">
        <p
          v-if="infoOpen"
          class="type-12-regular absolute top-full left-0 z-20 mt-2 w-72 rounded-2xl border border-neutral-5 bg-neutral-3 p-3 text-neutral-13 shadow-elevation-2"
        >
          {{ $t('case.rtpInfo') }}
        </p>
      </Transition>
    </div>

    <div class="order-3 col-span-2 grid flex-1 grid-cols-5 gap-3 lg:order-2 lg:gap-6">
      <div v-for="(r, i) in rows" :key="r.key" class="flex min-w-0 flex-col gap-1" :style="{ '--oc': r.color }">
        <div class="flex flex-col justify-between gap-0 lg:flex-row lg:items-baseline lg:gap-2">
          <span class="type-12-caps text-neutral-12">{{ r.label }}</span>
          <span class="type-14 lg:type-16-medium tabular-nums" :class="r.muted ? 'text-neutral-13' : 'kd-odds-value'">{{ pct(r.value) }}</span>
        </div>
        <!-- Thicker bar in the multiplier's colour, never thinner than a visible stub -->
        <div class="h-1.5 overflow-hidden rounded-full bg-neutral-6">
          <div
            class="kd-odds-bar h-full rounded-full"
            :style="{ width: shown ? `${Math.max(7, r.value / 100)}%` : '0%', transitionDelay: `${i * 70}ms`, background: 'var(--oc)' }"
          />
        </div>
        <span class="type-12-regular hidden text-neutral-11 tabular-nums lg:block">{{ oneIn(r.value) }}</span>
      </div>
    </div>

    <div class="order-2 ml-auto flex w-full max-w-40 flex-col gap-0.5 lg:order-3 lg:ml-0 lg:w-53.5 lg:max-w-none">
      <div class="flex items-center justify-between">
        <span class="type-12 text-neutral-12 uppercase">{{ $t('case.risk') }}</span>
        <span class="type-16-medium normal-case" :class="RISK_TEXT[data.risk]">{{ $t(`risk.${data.risk}`) }}</span>
      </div>
      <UiRiskMeter :level="data.risk" />
    </div>
  </div>
</template>

<style scoped>
.kd-odds-bar {
  transition: width 900ms var(--ease-out);
  box-shadow: 0 0 8px color-mix(in srgb, var(--oc) 60%, transparent);
}
.kd-odds-value {
  color: var(--oc);
}
.kd-tip-enter-active {
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.kd-tip-leave-active {
  transition: opacity var(--dur-fast) var(--ease-in);
}
.kd-tip-enter-from,
.kd-tip-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
