<script setup lang="ts">
import type { CaseDetails } from '#shared/types/api'

// Figma "TransparencyBlock": RTP + chances to hit <x1, x2+, x3+, x5+, x10+ of the price, plus risk.
const props = defineProps<{ data: CaseDetails }>()
const infoOpen = ref(false)
// phones: the odds show under the RTP row from the start (the chances are the point of the block); a chevron folds them,
// and the choice is remembered on every case (usePersisted: a cookie on the site, localStorage in the artifact, where
// cookies are blocked)
const oddsPref = usePersisted('kd_odds', { open: true })
const oddsOpen = computed({ get: () => oddsPref.value.open, set: (open: boolean) => (oddsPref.value = { ...oddsPref.value, open }) })
// the risk explains itself too: hover on desktop, a tap anywhere
const riskOpen = ref(false)
const hoverRisk = (e: PointerEvent, v: boolean) => e.pointerType === 'mouse' && (riskOpen.value = v)
// a mouse already opened it on hover: its click must not close it again; a tap toggles
let viaMouse = false
const markPointer = (e: PointerEvent) => (viaMouse = e.pointerType === 'mouse')
const tapRisk = () => (viaMouse ? (riskOpen.value = true) : (riskOpen.value = !riskOpen.value))

const pct = (bp: number) => `${(bp / 100).toFixed(1)}%`
/** "1 in 48" reads better than 2.1% for small chances */
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

/** Square-root scale with a visible minimum: 0.2% → 10%, 2.6% → 16%, 9.7% → 31%, 90% → 95% */
const fill = (bp: number) => Math.min(100, Math.max(10, Math.sqrt(bp / 10_000) * 100))

const RISK_COLOR = { low: 'var(--color-success)', medium: 'var(--color-coin)', high: 'var(--color-brand-light)', extreme: 'var(--color-danger)' } as const
const isLg = useMediaQuery('(min-width: 1024px)')
</script>

<template>
  <div
    ref="root"
    class="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3 rounded-5xl bg-neutral-2 px-4 py-3 lg:flex lg:gap-12 lg:py-[5px]"
  >
    <div class="relative order-1 flex items-center gap-2 lg:gap-3">
      <span class="text-xl leading-7 font-bold text-neutral-11 lg:type-28">{{ $t('case.rtp') }}</span>
      <span class="bg-brand-gradient bg-clip-text text-xl leading-7 font-bold text-transparent tabular-nums lg:type-28">{{ pct(data.rtp) }}</span>
      <UiButton variant="ghost" :size="isLg ? 'l' : 's'" icon="info" icon-only :aria-label="$t('case.rtpInfo')" :aria-expanded="infoOpen" @click="infoOpen = !infoOpen" />
      <Transition name="kd-tip">
        <p
          v-if="infoOpen"
          class="type-12-regular absolute top-full left-0 z-20 mt-2 w-72 rounded-2xl border border-neutral-5 bg-neutral-3 p-3 text-neutral-13 shadow-elevation-2"
        >
          {{ $t('case.rtpInfo') }}
        </p>
      </Transition>
    </div>

    <div id="kd-odds" class="order-3 col-span-3 grid flex-1 grid-cols-5 gap-3 lg:order-2 lg:gap-6" :class="!oddsOpen && 'max-lg:hidden'">
      <div v-for="(r, i) in rows" :key="r.key" class="flex min-w-0 flex-col gap-1" :style="{ '--oc': r.color }">
        <div class="flex flex-col justify-between gap-0 lg:flex-row lg:items-baseline lg:gap-2">
          <span class="type-12-caps text-neutral-12">{{ r.label }}</span>
          <span class="type-14 lg:type-16-medium tabular-nums" :class="r.muted ? 'text-neutral-13' : 'kd-odds-value'">{{ pct(r.value) }}</span>
        </div>
        <!-- The track is tinted in the multiplier's colour and the fill follows a square-root scale,
             so 2% still reads as a real bar next to 90% while the order stays honest. The fill is full width
             and slides in (transform only); the track clips it. -->
        <div class="kd-odds-track h-2 overflow-hidden rounded-full">
          <div
            class="kd-odds-bar h-full w-full rounded-full"
            :style="{ transform: `translateX(${shown ? fill(r.value) - 100 : -100}%)`, transitionDelay: `${i * 70}ms` }"
          />
        </div>
      </div>
    </div>

    <!-- Risk. Desktop: one more odds column — the label on top, the peppers and the level on one line under it.
         Phones: the same pieces in one line on the RTP row, right-aligned, a hairline away from the RTP's info. -->
    <button
      type="button"
      class="kd-hit relative order-2 flex min-w-0 items-center justify-end gap-2 text-left max-lg:h-8 max-lg:pl-1 lg:order-3 lg:w-44 lg:flex-col lg:items-start lg:justify-center lg:gap-1 lg:border-l lg:border-neutral-4 lg:pl-6"
      :style="{ '--oc': RISK_COLOR[data.risk] }"
      :aria-expanded="riskOpen"
      :aria-label="$t('case.riskInfo')"
      @pointerdown="markPointer"
      @click="tapRisk"
      @pointerenter="hoverRisk($event, true)"
      @pointerleave="hoverRisk($event, false)"
    >
      <!-- nudged down to sit on the odds labels' line (x2+, x3+…) -->
      <span class="type-12-caps text-neutral-12 max-sm:hidden lg:translate-y-1.5">{{ $t('case.risk') }}</span>
      <span class="flex items-center gap-2">
        <UiRiskPeppers :level="data.risk" :size="isLg ? 18 : 16" />
        <!-- phones: the peppers alone, as on the case cards (the word is in the tip), so the row never overflows -->
        <span class="type-14 lg:type-16-medium kd-odds-value leading-none max-sm:hidden">{{ $t(`risk.${data.risk}`) }}</span>
      </span>
      <Transition name="kd-tip">
        <p
          v-if="riskOpen"
          class="type-12-regular absolute top-full right-0 z-20 mt-2 w-72 rounded-2xl border border-neutral-5 bg-neutral-3 p-3 text-left text-neutral-13 shadow-elevation-2"
        >
          <span class="type-12-caps mb-1 block text-neutral-15">{{ $t(`risk.${data.risk}`) }}</span>
          {{ $t(`case.riskText.${data.risk}`) }}
          <span class="mt-2 block text-neutral-11">{{ $t('case.riskInfo') }}</span>
        </p>
      </Transition>
    </button>
    <UiButton
      variant="ghost"
      size="m"
      icon="chevron-down-sm"
      icon-only
      class="order-2 lg:hidden [&_svg]:transition-transform"
      :class="oddsOpen && '[&_svg]:rotate-180'"
      :aria-label="$t('case.odds')"
      :aria-expanded="oddsOpen"
      aria-controls="kd-odds"
      @click="oddsOpen = !oddsOpen"
    />
  </div>
</template>

<style scoped>
.kd-odds-track {
  background: color-mix(in srgb, var(--oc) 16%, var(--color-neutral-5));
}
.kd-odds-bar {
  background: linear-gradient(90deg, color-mix(in srgb, var(--oc) 70%, transparent), var(--oc));
  box-shadow: 0 0 10px color-mix(in srgb, var(--oc) 70%, transparent);
  transition: transform 900ms var(--ease-out);
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
