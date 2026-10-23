<script setup lang="ts">
import type { BattleCaseRef, CaseItem, CaseResponse, Item } from '#shared/types/api'

// Battle reel, in the same language as the case reel: items as ItemArt (rarity glow + star, no tiles),
// the same brand markers left and right, fades top and bottom; the drop flares and bursts when it lands.
// Waiting = the round's case floating.
const props = defineProps<{
  caseRef: BattleCaseRef | null
  /** Drop to land on for the current round, null while waiting */
  target: Item | null
  /** Changes every round; a new value starts a new spin */
  spinKey: string
  spinMs: number
  compact?: boolean
  waiting?: boolean
  /** Jump straight to the target (finished battles) */
  instant?: boolean
  /** Inside the room's shared arena: no frame or markers of its own (the arena has them) */
  bare?: boolean
  /** This reel voices the spin: a riser at the start, a tick per card past the marker (one reel per room) */
  voiced?: boolean
}>()
const emit = defineEmits<{ landed: [item: Item] }>()
const sfx = useSfx()

const root = useTemplateRef<HTMLElement>('root')
const track = useTemplateRef<HTMLElement>('track')
const { height } = useElementSize(root)
const cell = computed(() => (props.compact ? 84 : 180))

// Filler items come from the case being opened this round
const caseItems = ref<CaseItem[]>([])
watch(
  () => props.caseRef?.slug,
  async (slug) => {
    if (!slug) return
    const res = await $fetch<CaseResponse>(`/api/cases/${slug}`)
    caseItems.value = res.case.items
  },
  { immediate: true },
)

const STRIP = 30
const WIN = STRIP - 4
const strip = ref<Item[]>([])
const landed = ref(false)

// The drop gets the same rarity grade as a case drop: the rank reveal on its rarity shape (more layers the rarer),
// on a layer under the strip so it bursts from behind the skin
const fxHost = useTemplateRef<HTMLElement>('fxHost')
const fxBack = useForge(fxHost)
let beam: Awaited<ReturnType<typeof rarityRank>> = null
function stopBeam() {
  beam?.stop()
  beam = null
}
onBeforeUnmount(stopBeam)
async function dropFx(it: Item) {
  await nextTick()
  const card = root.value?.querySelector<HTMLElement>('[data-win]')
  if (!card) return
  const scale = props.compact ? 1 : 1.5
  rarityRank(fxBack, card.querySelector<HTMLElement>('.kd-art img') ?? card, it.rarity, scale).then((h) => (landed.value ? (beam = h) : h?.kill()))
}

async function spin() {
  if (!props.target || !track.value) return
  // Filler follows the case's real odds, like the case reel
  const pool = caseItems.value
  stopBeam()
  strip.value = Array.from({ length: STRIP }, (_, i) => (i === WIN || !pool.length ? props.target! : pickByTickets(pool)))
  landed.value = false
  await nextTick()
  const el = track.value
  const len = height.value
  const from = len / 2 - (2 * cell.value + cell.value / 2)
  const to = len / 2 - (WIN * cell.value + cell.value / 2)
  const jitter = (Math.random() - 0.5) * cell.value * 0.5
  const duration = props.instant ? 1 : Math.max(600, props.spinMs)
  const anim = el.animate([{ transform: `translateY(${from}px)` }, { transform: `translateY(${to + jitter}px)` }], {
    duration,
    easing: 'cubic-bezier(0.1, 0.6, 0.12, 1)',
    fill: 'forwards',
  })
  // Tick when a card crosses the marker, like the case reel
  let raf = 0
  if (props.voiced && !props.instant) {
    sfx.riser()
    let last = -1
    const ticks = () => {
      const y = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42
      const idx = Math.floor((len / 2 - y) / cell.value)
      if (idx !== last) {
        if (last >= 0) sfx.tick()
        last = idx
      }
      raf = requestAnimationFrame(ticks)
    }
    raf = requestAnimationFrame(ticks)
  }
  await animationDone(anim, duration)
  cancelAnimationFrame(raf)
  const settle = el.animate([{ transform: `translateY(${to + jitter}px)` }, { transform: `translateY(${to}px)` }], {
    duration: props.instant ? 1 : 300,
    easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    fill: 'forwards',
  })
  await animationDone(settle, props.instant ? 1 : 300)
  el.style.transform = `translateY(${to}px)`
  anim.cancel()
  settle.cancel()
  landed.value = true
  if (!props.instant) {
    dropFx(props.target)
    emit('landed', props.target)
  }
}

watch(
  () => [props.spinKey, props.waiting],
  () => nextTick(spin),
)
onMounted(() => props.target && nextTick(spin))

// Keep a landed reel centred when the viewport switches between compact and desktop sizes
watch([height, cell], () => {
  if (landed.value && track.value) track.value.style.transform = `translateY(${height.value / 2 - (WIN * cell.value + cell.value / 2)}px)`
})
</script>

<template>
  <div ref="root" class="relative overflow-hidden" :class="[compact ? 'h-50' : 'h-96', bare ? '' : 'kd-preel rounded-2xl']">
    <div v-if="waiting || !target" class="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
      <img v-if="caseRef" :src="caseRef.image" alt="" class="kd-preel-wait object-contain" :class="compact ? 'size-16' : 'size-32'" />
      <span class="type-12-regular text-neutral-11">{{ compact ? $t('pvp.waiting') : $t('pvp.waitingForPlayers') }}</span>
    </div>
    <template v-else>
      <div ref="fxHost" class="pointer-events-none absolute inset-0" />
      <div ref="track" class="absolute inset-x-0 top-0" :class="!landed && 'will-change-transform'">
        <div
          v-for="(it, i) in strip"
          :key="i"
          class="kd-preel-card relative flex items-center justify-center"
          :class="landed && 'is-landed'"
          :style="{ height: `${cell}px` }"
          :data-win="(landed && i === WIN) || undefined"
        >
          <ItemArt :image="it.image" :rarity="it.rarity" :size="compact ? 60 : 124" class="relative w-full" />
        </div>
      </div>
      <div class="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-neutral-1 to-transparent" :class="compact ? 'h-12' : 'h-20'" />
      <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-1 to-transparent" :class="compact ? 'h-12' : 'h-20'" />
      <template v-if="!bare">
        <img src="/img/fx/marker-top.svg" alt="" class="kd-pmark absolute top-1/2 left-0 -ml-0.5 -rotate-90" :class="compact ? 'w-3' : 'w-5'" />
        <img src="/img/fx/marker-top.svg" alt="" class="kd-pmark absolute top-1/2 right-0 -mr-0.5 rotate-90" :class="compact ? 'w-3' : 'w-5'" />
      </template>
    </template>
  </div>
</template>

<style scoped>
.kd-preel-card {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring),
    filter var(--dur-slow) var(--ease-out);
}
.kd-preel-card.is-landed:not([data-win]) {
  opacity: 0.2;
  filter: grayscale(0.6);
}
.kd-preel-card[data-win] {
  transform: scale(1.12);
  z-index: 1;
  animation: kd-pwin 700ms var(--ease-out);
}
@keyframes kd-pwin {
  0% {
    filter: brightness(2.2) saturate(1.4);
  }
}
/* Same frame language as the case reel: it warms up towards the markers, so they sit on it */
.kd-preel {
  border: 3px solid transparent;
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(180deg, var(--color-neutral-4) 15%, rgb(255 95 31 / 0.85) 50%, var(--color-neutral-4) 85%) border-box;
}
.kd-pmark {
  translate: 0 -50%;
}
.kd-preel-wait {
  animation: kd-wait-float 3.2s ease-in-out infinite;
}
@keyframes kd-wait-float {
  50% {
    transform: translateY(-6px) rotate(-2deg);
  }
}
</style>
