<script setup lang="ts">
import type { CaseSummary } from '#shared/types/api'
import type { RigPlayback } from '~/utils/spineStage'

// Figma "CaseCard" states: Default → Hover (surface lifts to neutral-4, art settles 232→220,
// price becomes the brand-gradient button, risk reveals its label) → Active (80% opacity).
const props = defineProps<{ item: CaseSummary; big?: boolean }>()
const { onPointerMove } = useSpotlight()
const { t } = useI18n()
const session = useSessionStore()

// One badge per card, hottest first: HOT → a big multiplier today → brand new. Fiery ones burn (Forge).
const badge = computed(() => {
  if (props.item.tag === 'hot') return { kind: 'hot', text: t('cases.tag.hot') }
  if ((props.item.bestToday ?? 0) >= 10) return { kind: 'today', text: t('cases.today', { x: props.item.bestToday }) }
  if (props.item.tag === 'new') return { kind: 'new', text: t('cases.tag.new') }
  return null
})

const RISK_TEXT = { low: 'text-success', medium: 'text-coin', high: 'text-brand-light', extreme: 'text-danger' } as const

/** A limited case: what is left, and how full the bar is; low stock turns hot */
const stock = computed(() => {
  const l = props.item.limited
  if (!l) return null
  const share = l.total ? l.left / l.total : 0
  return { left: l.left, share, out: l.left <= 0, low: share <= 0.1 }
})

// Skeletal art plays only while the card is on screen and holds a playback slot; until the rig's
// first frame is drawn (and after it stops, or if it never loads) the static WebP stays in place.
const artBox = useTemplateRef<HTMLElement>('artBox')
const rigCanvas = useTemplateRef<HTMLCanvasElement>('rigCanvas')
const playing = useArtPlayback(artBox, () => !!(props.item.rig || props.item.animation))
const animReady = ref(false)
watch(playing, (v) => !v && !props.item.rig && (animReady.value = false))
// The rig is square: fit it into the art box like object-contain, drawn at device resolution
const { width: boxW, height: boxH } = useElementSize(artBox)
const side = computed(() => Math.floor(Math.min(boxW.value, boxH.value)))
let rigPlayback: RigPlayback | null = null
watch(
  [rigCanvas, side],
  ([canvas, s], _, onCleanup) => {
    animReady.value = false
    if (!canvas || !s || !props.item.rig) return
    canvas.width = canvas.height = Math.min(512, Math.round(s * Math.min(2, window.devicePixelRatio || 1)))
    const playback = playRig(canvas, props.item.rig, () => (animReady.value = true))
    rigPlayback = playback
    onCleanup(() => {
      playback.stop()
      if (rigPlayback === playback) rigPlayback = null
    })
  },
  { flush: 'post' },
)
// A mouse over the card: the rig plays its hover animation and looks toward the pointer
function onArtPointer(e: PointerEvent) {
  onPointerMove(e)
  if (e.pointerType !== 'mouse' || !rigPlayback || !artBox.value) return
  const r = artBox.value.getBoundingClientRect()
  rigPlayback.hover(true)
  rigPlayback.look(((e.clientX - r.left) / r.width) * 2 - 1)
}
function onArtLeave() {
  rigPlayback?.hover(false)
  rigPlayback?.look(null)
}
</script>

<template>
  <!-- A wrapper, so "Try free" can sit on the card without nesting one link in another -->
  <div class="relative">
  <NuxtLink
    :to="`/case/${item.slug}`"
    class="kd-case-card kd-spotlight group relative flex h-full flex-col items-center gap-2 rounded-5xl border"
    :class="[stock?.out && 'is-sold-out', big && 'is-big']"
    @pointermove="onArtPointer"
    @pointerleave="onArtLeave"
  >
    <div ref="artBox" class="kd-case-art-box relative aspect-square w-full lg:aspect-auto" :class="big ? 'lg:min-h-55 lg:flex-1' : 'lg:h-55'">
      <img
        :src="item.image"
        :alt="item.name"
        loading="lazy"
        draggable="false"
        class="kd-case-art size-full object-contain"
        :class="{ invisible: animReady }"
      />
      <canvas
        v-if="playing && item.rig"
        ref="rigCanvas"
        aria-hidden="true"
        class="kd-case-art absolute top-1/2 left-1/2 -translate-1/2"
        :class="{ invisible: !animReady }"
        :style="{ width: `${side}px`, height: `${side}px` }"
      />
      <img
        v-else-if="playing && item.animation"
        :src="item.animation"
        alt=""
        aria-hidden="true"
        draggable="false"
        class="kd-case-art absolute inset-0 size-full object-contain"
        :class="{ invisible: !animReady }"
        @load="animReady = true"
      />
      <!-- a limited case: how many are left, as a plate with a bar over the art's foot -->
      <span v-if="stock" class="kd-stock type-10-caps absolute bottom-1 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 rounded-md px-2 pt-1 pb-1.5" :class="[stock.low && 'is-low', stock.out && 'is-out']">
        <span class="flex items-center gap-1 whitespace-nowrap tabular-nums">
          <UiIcon :name="stock.out ? 'x-circle' : 'fire'" :size="12" />
          {{ stock.out ? $t('cases.soldOut') : $t('cases.left', { n: stock.left }) }}
        </span>
        <span v-if="!stock.out" class="kd-stock-track h-0.5 w-full overflow-hidden rounded-full"><span class="kd-stock-fill block h-full rounded-full" :style="{ width: `${Math.max(4, stock.share * 100)}%` }" /></span>
      </span>
    </div>

    <div class="flex w-full flex-col items-center gap-2 px-3 pb-3 lg:gap-3 lg:px-4 lg:pb-[14px]">
      <h3 class="w-full truncate text-center" :class="big ? 'type-14-caps lg:type-20-caps' : 'type-12-caps lg:type-14-caps'">{{ item.name }}</h3>

      <div class="kd-case-price relative flex w-full items-center justify-center rounded-lg py-1.5 lg:py-2">
        <span class="kd-case-price-fill bg-brand-gradient absolute inset-0 rounded-lg shadow-inner-primary" />
        <span class="relative grid">
          <UiPrice :amount="item.price" size="l" tone="coin" class="kd-case-price-a col-start-1 row-start-1" />
          <UiPrice :amount="item.price" size="l" tone="inverse" class="kd-case-price-b col-start-1 row-start-1" />
        </span>
      </div>

      <div class="flex h-4 w-full items-center">
        <span class="kd-case-risk-label type-10-caps overflow-hidden text-neutral-11">{{ $t('risk.label') }}</span>
        <!-- risk as the case page shows it: peppers -->
        <span class="flex flex-1 justify-center"><UiRiskPeppers :level="item.risk" :size="16" /></span>
        <span class="kd-case-risk-label type-12 overflow-hidden text-right" :class="RISK_TEXT[item.risk]">
          {{ $t(`risk.${item.risk}`) }}
        </span>
      </div>
    </div>

    <span v-if="badge" class="absolute top-3 left-3 lg:top-4 lg:left-4">
      <!-- Only HOT cases burn; the other badges stay calm so the fire still means something -->
      <FxFire :on="badge.kind === 'hot'">
        <span class="kd-badge type-10-caps relative z-[2] inline-flex items-center gap-1 rounded-sm px-1.5 py-1" :class="`is-${badge.kind}`">
          <UiIcon :name="badge.kind === 'today' ? 'trophy' : badge.kind === 'new' ? 'sparkle' : 'fire'" :size="12" />
          {{ badge.text }}
        </span>
      </FxFire>
    </span>
  </NuxtLink>
  <!-- Guests: open any case as a free demo spin (the first win before signing in) -->
  <NuxtLink
    v-if="!session.user"
    :to="`/case/${item.slug}?demo=1`"
    :aria-label="$t('case.tryFreeHint', { name: item.name })"
    class="kd-try kd-press type-10-caps absolute top-3 right-3 inline-flex h-6 items-center gap-1 rounded-sm px-1.5 lg:top-4 lg:right-4"
  >
    <UiIcon name="demo" :size="12" />
    {{ $t('case.tryFree') }}
  </NuxtLink>
  </div>
</template>

<style scoped>
/* Quiet next to the badges: a glass chip that lights up on hover */
.kd-try {
  color: var(--color-neutral-14);
  background: rgb(12 13 16 / 0.64);
  box-shadow: inset 0 0 0 1px var(--color-neutral-6);
  backdrop-filter: blur(6px);
  transition:
    color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}
.kd-try:hover {
  color: var(--color-neutral-15);
  box-shadow: inset 0 0 0 1px var(--color-brand-base);
}
/* Badges, three different voices: HOT is fire (orange → red, burning on Forge), a big win today is
   gold like the coin, new is a cool white sheen */
.kd-badge {
  color: var(--color-neutral-15);
  text-shadow: 0 1px 0 rgb(0 0 0 / 0.35);
}
.kd-badge.is-hot {
  background: linear-gradient(180deg, #ffb13b, var(--color-brand-base) 60%, #d93a12);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.35),
    0 0 12px rgb(255 95 31 / 0.55);
}
.kd-badge.is-today {
  color: #3a2400;
  text-shadow: 0 1px 0 rgb(255 255 255 / 0.3);
  background: linear-gradient(180deg, #ffe58a, #f5b82e 55%, var(--color-gold-dark));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.5),
    0 0 10px rgb(245 184 46 / 0.35);
}
.kd-badge.is-new {
  position: relative;
  overflow: hidden;
  color: var(--color-neutral-1);
  text-shadow: none;
  background: #e8ecf5;
  box-shadow: inset 0 -1px 0 rgb(0 0 0 / 0.12);
}
/* the sheen is a strip that slides across (transform only, no repaint of the badge) */
.kd-badge.is-new::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgb(255 255 255 / 0.9) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: kd-badge-sheen 2.8s ease-in-out infinite;
  pointer-events: none;
}
@keyframes kd-badge-sheen {
  60%,
  100% {
    transform: translateX(100%);
  }
}
/* the stock plate sits on the art's foot */
.kd-stock {
  z-index: 2;
  background: rgb(12 13 16 / 0.82);
  color: var(--color-neutral-14);
  box-shadow: inset 0 0 0 1px var(--color-neutral-6);
  backdrop-filter: blur(6px);
  min-width: 84px;
}
.kd-stock-track {
  background: var(--color-neutral-5);
}
.kd-stock-fill {
  background: var(--color-coin);
}
.kd-stock.is-low {
  color: var(--color-brand-light);
  box-shadow: inset 0 0 0 1px rgb(255 95 31 / 0.55);
}
.kd-stock.is-low .kd-stock-fill {
  background: var(--color-brand-base);
}
.kd-stock.is-out {
  color: var(--color-neutral-11);
}
.kd-case-card.is-sold-out .kd-case-art {
  opacity: 0.4;
  filter: grayscale(1);
}
.kd-case-card {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-4);
  transition:
    background-color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}
.kd-case-art {
  transition: transform var(--dur-base) var(--ease-out);
}
/* Figma: art 232 by default, 220 on hover. The box stays 220 and only the image scales,
   so the card never changes height. */
@media (min-width: 64rem) {
  .kd-case-art {
    transform: scale(1.055);
  }
}
.kd-case-price-fill {
  opacity: 0;
  transform: scale(0.94);
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-case-price-a,
.kd-case-price-b {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-case-price-b {
  opacity: 0;
  transform: translateY(4px);
}
.kd-case-risk-label {
  max-width: 0;
  opacity: 0;
  white-space: nowrap;
  transition:
    max-width var(--dur-slow) var(--ease-out),
    opacity var(--dur-base) var(--ease-out),
    margin var(--dur-slow) var(--ease-out);
}

@media (hover: hover) {
  .kd-case-card:hover {
    background: var(--color-neutral-4);
    border-color: var(--color-neutral-6);
  }
  .kd-case-card:hover .kd-case-art {
    transform: none;
  }
  .kd-case-card:hover .kd-case-price-fill {
    opacity: 1;
    transform: scale(1);
  }
  .kd-case-card:hover .kd-case-price-a {
    opacity: 0;
    transform: translateY(-4px);
  }
  .kd-case-card:hover .kd-case-price-b {
    opacity: 1;
    transform: none;
  }
  .kd-case-card:hover .kd-case-risk-label {
    max-width: 80px;
    opacity: 1;
  }
  .kd-case-card:hover .kd-case-risk-label:first-child {
    margin-right: 8px;
  }
  .kd-case-card:hover .kd-case-risk-label:last-child {
    margin-left: 8px;
  }
}
.kd-case-card:active {
  transform: scale(0.98);
  opacity: 0.8;
  transition-duration: var(--dur-press);
}
</style>
