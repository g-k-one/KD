<script setup lang="ts">
/*
 * Level-up moment (player audit D6). When the level goes up a plate drops in at the top centre:
 *   the level badge (same art as the header) with the number rolling from the old level to the new one, the new
 *   level in big letters, and what it means in one line — the only thing levels give is a better daily case, so
 *   on a new tier: "Daily case → Tier III: skins up to …" with a button to Bonuses; otherwise how many levels to
 *   the next tier (or that the daily case is at the top). Levels pay no coins (cut on 2026-10-23).
 *   A thin bar runs down the time left; hovering holds it. Light: our kdReveal in gold behind the badge.
 */
const session = useSessionStore()
const sfx = useSfx()
const haptics = useHaptics()
const fx = useForge()
const { data: bonuses, refresh } = useBonuses()

const shown = ref<number | null>(null)
const from = ref<number | null>(null)
const badge = useTemplateRef<HTMLElement>('badge')
const DURATION = 5000
const paused = ref(false)
let left = DURATION
let started = 0
let timer: ReturnType<typeof setTimeout> | undefined

function arm(ms: number) {
  clearTimeout(timer)
  started = Date.now()
  left = ms
  timer = setTimeout(() => (shown.value = null), ms)
}
function hold() {
  paused.value = true
  clearTimeout(timer)
  left -= Date.now() - started
}
function release() {
  paused.value = false
  arm(Math.max(1200, left))
}

watch(
  () => session.user?.level,
  (lv, before) => {
    if (!import.meta.client || lv == null || before == null || lv <= before) return
    from.value = before
    shown.value = before
    refresh()
    sfx.levelUp()
    haptics.rare()
    // the number rolls up a beat after the plate lands, then the light
    setTimeout(() => {
      shown.value = lv
      fx.at('kdReveal', badge.value, 1.4).then((h) => {
        h?.set('tint', [1, 0.8, 0.32])
        h?.set('level', 2)
      })
    }, 380)
    arm(DURATION)
  },
)
const tierNames = ['I', 'II', 'III', 'IV']
const ladder = computed(() => bonuses.value?.daily.ladder ?? [])
/** The tier this level just reached (it starts at this level), else null */
const newTier = computed(() => ladder.value.find((s) => s.fromLevel === shown.value && s.tier > 0) ?? null)
/** The next tier still ahead, for "N more levels to Tier …" */
const nextTier = computed(() => ladder.value.find((s) => shown.value != null && s.fromLevel > shown.value) ?? null)
</script>

<template>
  <Transition name="kd-lvl">
    <div
      v-if="shown"
      class="kd-lvl fixed top-[calc(76px+env(safe-area-inset-top))] left-1/2 z-[66] flex w-[min(400px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-3xl lg:top-24"
      @pointerenter="hold"
      @pointerleave="release"
    >
      <div class="flex items-center gap-4 p-4">
        <span ref="badge" class="kd-lvl-badge relative grid size-16 shrink-0 place-items-center">
          <img src="/img/brand/level-badge.svg" alt="" class="absolute inset-0 size-full" />
          <UiTextSwap :text="String(shown)" class="relative text-2xl leading-none font-extrabold text-neutral-1 tabular-nums" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-1">
          <span class="type-12-caps kd-lvl-kicker">{{ $t('bonus.levelUp') }}</span>
          <span class="type-20-caps leading-6">{{ $t('bonus.levelTitle', { n: shown }) }}</span>
          <!-- what it means, in one line -->
          <span class="type-12-regular text-neutral-13">
            <template v-if="newTier">{{ $t('bonus.levelNewTier', { tier: tierNames[newTier.tier], amount: formatCoins(newTier.value) }) }}</template>
            <template v-else-if="nextTier">{{ $t('bonus.levelToTier', { n: nextTier.fromLevel - shown, tier: tierNames[nextTier.tier] }) }}</template>
            <template v-else-if="ladder.length">{{ $t('bonus.levelTopTier') }}</template>
          </span>
        </span>
        <UiButton v-if="newTier" variant="gold" size="s" to="/bonuses" class="shrink-0" @click.capture="shown = null">{{ $t('bonus.open') }}</UiButton>
      </div>
      <!-- time left before it goes away by itself -->
      <span class="h-0.5 w-full bg-neutral-4">
        <span :key="String(from) + String(shown)" class="kd-lvl-time block h-full" :class="paused && 'is-paused'" :style="{ animationDuration: `${DURATION}ms` }" />
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.kd-lvl {
  background:
    radial-gradient(60% 120% at 12% 50%, rgb(255 177 59 / 0.28), transparent 70%),
    linear-gradient(100deg, #2a2113, var(--color-neutral-3) 60%);
  box-shadow:
    0 12px 32px rgb(0 0 0 / 0.6),
    0 0 40px -12px rgb(255 177 59 / 0.6);
}
.kd-lvl-kicker {
  color: var(--color-gold-light);
}
.kd-lvl-badge {
  animation: kd-lvl-pop 700ms var(--ease-spring) 380ms both;
}
@keyframes kd-lvl-pop {
  0% {
    scale: 1;
  }
  40% {
    scale: 1.25;
    rotate: -6deg;
  }
  100% {
    scale: 1;
  }
}
.kd-lvl-time {
  background: linear-gradient(90deg, #ffb13b, var(--color-brand-base));
  transform-origin: left;
  animation: kd-lvl-time linear both;
}
.kd-lvl-time.is-paused {
  animation-play-state: paused;
}
@keyframes kd-lvl-time {
  to {
    transform: scaleX(0);
  }
}
.kd-lvl-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    translate var(--dur-slow) var(--ease-spring),
    scale var(--dur-slow) var(--ease-spring);
}
.kd-lvl-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-in),
    translate var(--dur-base) var(--ease-in);
}
.kd-lvl-enter-from {
  opacity: 0;
  translate: 0 -24px;
  scale: 0.92;
}
.kd-lvl-leave-to {
  opacity: 0;
  translate: 0 -12px;
}
</style>
