<script setup lang="ts">
import type { CaseSummary } from '#shared/types/api'
import type { RigPlayback } from '~/utils/spineStage'

// Figma "CaseCard" states: Default → Hover (surface lifts to neutral-4, art settles 232→220,
// price becomes the brand-gradient button, risk reveals its label) → Active (80% opacity).
/** shape: the bento cell this card fills — wide 2×1 or tall 1×2 shows the matching picture (desktop) */
/** look: a themed row's look — coop drops the plate and sits the case in a nest */
const props = defineProps<{ item: CaseSummary; shape?: 'wide' | 'tall'; look?: 'coop' }>()
const shaped = computed(() => (props.shape ? props.item.art?.[props.shape] : undefined))
/** A full-art card (the layout says so and the art is there): the scene fills the card; a themed row and a bento cell keep their own art */
const full = computed(() => (!props.look && !shaped.value && props.item.card === 'full' ? props.item.art?.full : undefined))
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
const playing = useArtPlayback(artBox, () => !full.value && !!(props.item.rig || props.item.animation))
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
    :class="[stock?.out && 'is-sold-out', shape && `is-${shape}`, look && `look-${look}`, full && 'is-full']"
    @pointermove="onArtPointer"
    @pointerleave="onArtLeave"
  >
    <!-- full art: the scene behind everything, darkened at the foot where the text sits -->
    <img v-if="full" :src="full" :alt="item.name" loading="lazy" draggable="false" class="kd-case-full" />
    <span v-if="full" class="kd-case-scrim" aria-hidden="true" />
    <div ref="artBox" class="kd-case-art-box relative aspect-square w-full lg:aspect-auto" :class="shape === 'tall' ? 'lg:min-h-55 lg:flex-1' : 'lg:h-55'">
      <!-- coop: the nest's back half sits behind the case, its front rim over it, so the case sits inside -->
      <img v-if="look === 'coop'" src="/img/coop/nest-back.webp" alt="" aria-hidden="true" draggable="false" class="kd-nest is-back" />
      <img
        :src="item.image"
        :alt="item.name"
        loading="lazy"
        draggable="false"
        class="kd-case-art size-full object-contain"
        :class="[{ invisible: animReady || full }, shaped && 'lg:hidden']"
      />
      <!-- the shaped picture for a wide / tall bento cell (desktop) -->
      <img v-if="shaped" :src="shaped" :alt="item.name" loading="lazy" draggable="false" class="kd-case-art absolute inset-0 hidden size-full object-contain max-lg:hidden lg:block" />
      <canvas
        v-if="playing && item.rig"
        ref="rigCanvas"
        aria-hidden="true"
        class="kd-case-art absolute top-1/2 left-1/2 -translate-1/2"
        :class="[{ invisible: !animReady }, shaped && 'lg:hidden']"
        :style="{ width: `${side}px`, height: `${side}px` }"
      />
      <img
        v-else-if="playing && item.animation"
        :src="item.animation"
        alt=""
        aria-hidden="true"
        draggable="false"
        class="kd-case-art absolute inset-0 size-full object-contain"
        :class="[{ invisible: !animReady }, shaped && 'lg:hidden']"
        @load="animReady = true"
      />
      <img v-if="look === 'coop'" src="/img/coop/nest-front.webp" alt="" aria-hidden="true" draggable="false" class="kd-nest is-front" />
      <!-- a limited case: a burning plate on the art's foot. The plate is its own gauge: the fire-coloured part is
           what is left of the stock, the rest is burnt-out ember. Sold out, it goes cold and grey. -->
      <span v-if="stock" class="absolute bottom-1 left-1/2 z-[2] -translate-x-1/2">
        <FxFire :on="!stock.out" effect="kdBlaze" :spread="stock.low ? 2 : 1.6">
          <span class="kd-stock type-12-caps relative z-[2] inline-flex h-6 items-center overflow-hidden rounded-md px-2 whitespace-nowrap tabular-nums" :class="[stock.low && 'is-low', stock.out && 'is-out']">
            <span v-if="!stock.out" class="kd-stock-fill absolute inset-0" :style="{ transform: `scaleX(${Math.max(0.06, stock.share)})` }" />
            <span class="relative flex items-center gap-1">
              <UiIcon :name="stock.out ? 'x-circle' : 'fire'" :size="12" />
              {{ stock.out ? $t('cases.soldOut') : $t('cases.left', { n: stock.left }) }}
            </span>
          </span>
        </FxFire>
      </span>
    </div>

    <div class="flex w-full flex-col items-center gap-2 px-3 pb-3 lg:gap-3 lg:px-4 lg:pb-[14px]">
      <h3 class="type-12-caps lg:type-14-caps w-full truncate text-center">{{ item.name }}</h3>

      <div class="kd-case-price relative flex w-full items-center justify-center rounded-lg py-1.5 lg:py-2">
        <span class="kd-case-price-fill bg-brand-gradient absolute inset-0 rounded-lg shadow-inner-primary" />
        <span class="relative grid">
          <UiPrice :amount="item.price" size="l" tone="coin" class="kd-case-price-a col-start-1 row-start-1" />
          <UiPrice :amount="item.price" size="l" tone="inverse" class="kd-case-price-b col-start-1 row-start-1" />
        </span>
      </div>

      <!-- risk as the case page shows it: peppers, pinned to the middle; the labels fade in at the edges on hover -->
      <div class="relative flex h-4 w-full items-center justify-center">
        <span class="kd-case-risk-label is-start type-10-caps absolute left-0 text-neutral-11">{{ $t('risk.label') }}</span>
        <UiRiskPeppers :level="item.risk" :size="16" />
        <span class="kd-case-risk-label is-end type-12 absolute right-0" :class="RISK_TEXT[item.risk]">
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
  <!-- tools laid over the card (the home layout editor) -->
  <slot />
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
/* the stock plate: burnt-out ember under a fire-coloured fill for what is left (the HOT badge's fire, so the two
   read as one family) */
.kd-stock {
  min-width: 84px;
  justify-content: center;
  color: var(--color-neutral-15);
  text-shadow: 0 1px 0 rgb(0 0 0 / 0.45);
  background: #3b1309;
  box-shadow:
    inset 0 0 0 1px rgb(255 95 31 / 0.6),
    0 0 12px rgb(255 95 31 / 0.4);
}
.kd-stock-fill {
  transform-origin: left center;
  background: linear-gradient(180deg, #ffb13b, var(--color-brand-base) 60%, #d93a12);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.35);
}
/* the last tenth: the ember glows hotter */
.kd-stock.is-low {
  box-shadow:
    inset 0 0 0 1px rgb(255 177 59 / 0.85),
    0 0 18px rgb(255 95 31 / 0.65);
}
.kd-stock.is-out {
  color: var(--color-neutral-11);
  text-shadow: none;
  background: rgb(12 13 16 / 0.82);
  box-shadow: inset 0 0 0 1px var(--color-neutral-6);
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
  opacity: 0;
  white-space: nowrap;
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.kd-case-risk-label.is-start {
  transform: translateX(-6px);
}
.kd-case-risk-label.is-end {
  transform: translateX(6px);
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
    opacity: 1;
    transform: none;
  }
}
/* --- full art: the scene fills the card and drifts closer on hover --- */
.kd-case-card.is-full {
  isolation: isolate;
  overflow: hidden;
}
.kd-case-full,
.kd-case-scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.kd-case-full {
  object-fit: cover;
  object-position: 50% 30%;
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-case-scrim {
  background: linear-gradient(180deg, transparent 42%, rgb(10 11 14 / 0.72) 68%, rgb(10 11 14 / 0.94));
}
.is-full h3 {
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.8);
}
@media (hover: hover) {
  .kd-case-card.is-full:hover .kd-case-full {
    transform: scale(1.05);
  }
}
/* --- coop: no plate; the case sits low in a straw nest and hops up out of it on hover --- */
.kd-case-card.look-coop {
  background: none;
  border-color: transparent;
}
.look-coop .kd-case-art-box {
  isolation: isolate;
}
.kd-nest {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 70%;
  translate: -50% 0;
  pointer-events: none;
}
.kd-nest.is-back {
  z-index: -1;
}
.kd-nest.is-front {
  z-index: 1;
}
.look-coop .kd-case-art {
  transform: translateY(-15%) scale(0.78);
  transition: transform var(--dur-slow) var(--ease-spring);
}
.look-coop h3 {
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.8);
}
@media (hover: hover) {
  /* no plate, so hover draws the outline: the same soft white on every case */
  .kd-case-card.look-coop:hover {
    background: none;
    border-color: var(--color-white-12);
  }
  .look-coop:hover .kd-case-art {
    transform: translateY(-22%) scale(0.8);
  }
}
.kd-case-card:active {
  transform: scale(0.98);
  opacity: 0.8;
  transition-duration: var(--dur-press);
}
</style>
