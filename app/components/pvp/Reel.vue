<script setup lang="ts">
import type { BattleCaseRef, CaseItem, CaseResponse, Item } from '#shared/types/api'

// Figma "BattleReel": Waiting = case art placeholder; Spinning = square items on rarity glow,
// fades top and bottom, short brand markers left and right.
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
}>()

const root = useTemplateRef<HTMLElement>('root')
const track = useTemplateRef<HTMLElement>('track')
const { height } = useElementSize(root)
const cell = computed(() => (props.compact ? 80 : 158))

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

async function spin() {
  if (!props.target || !track.value) return
  // Filler follows the case's real odds, like the case reel
  const pool = caseItems.value
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
  await animationDone(anim, duration)
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
  <div ref="root" class="kd-preel relative overflow-hidden bg-neutral-2" :class="compact ? 'h-50 rounded-2xl' : 'h-80 rounded-3xl'">
    <div v-if="waiting || !target" class="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
      <img v-if="caseRef" :src="caseRef.image" alt="" class="kd-preel-wait object-contain" :class="compact ? 'size-14' : 'size-30'" />
      <span class="type-12-regular text-neutral-11">{{ compact ? $t('pvp.waiting') : $t('pvp.waitingForPlayers') }}</span>
    </div>
    <template v-else>
      <div ref="track" class="absolute inset-x-0 top-0 will-change-transform">
        <div
          v-for="(it, i) in strip"
          :key="i"
          class="flex items-center justify-center"
          :style="{ height: `${cell}px` }"
        >
          <div
            class="kd-preel-item relative overflow-hidden"
            :class="[compact ? 'size-[75px] rounded-md' : 'size-[150px] rounded-2xl', landed && i === WIN && 'is-win']"
            :style="{ '--rc': RARITY_COLOR[it.rarity] }"
          >
            <img :src="it.image" alt="" class="absolute inset-[16%_7%] size-[86%] object-contain" />
            <span class="absolute inset-x-0 bottom-0" :class="compact ? 'h-[1.5px]' : 'h-[3px]'" :style="{ background: 'var(--rc)' }" />
          </div>
        </div>
      </div>
      <div class="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-neutral-2 to-transparent" :class="compact ? 'h-15' : 'h-24'" />
      <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-2 to-transparent" :class="compact ? 'h-15' : 'h-24'" />
      <span class="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-brand-base" :class="compact ? 'w-1.5' : 'w-2.5'" />
      <span class="absolute top-1/2 right-0 h-0.5 -translate-y-1/2 bg-brand-base" :class="compact ? 'w-1.5' : 'w-2.5'" />
    </template>
  </div>
</template>

<style scoped>
.kd-preel-item {
  background: radial-gradient(120% 90% at 50% 12%, color-mix(in srgb, var(--rc) 35%, transparent), var(--color-neutral-3) 95%);
  transition:
    transform var(--dur-slow) var(--ease-spring),
    box-shadow var(--dur-slow) var(--ease-out);
}
.kd-preel-item.is-win {
  transform: scale(1.06);
  box-shadow: 0 0 0 1px var(--rc), 0 0 28px -6px var(--rc);
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
