<script setup lang="ts">
/*
 * Level-up moment (player audit D6). When the level goes up a plate drops in at the top centre, built around its
 * middle: the level badge (same art as the header) standing half over the plate's top edge, its number rolling from
 * the old level to the new one; under it the kicker, the new level in big letters, and what it means in one line — the only thing levels give is a better daily case, so
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
      class="kd-lvl fixed inset-x-0 top-[calc(100px+env(safe-area-inset-top))] z-[66] mx-auto flex w-[min(340px,calc(100vw-32px))] flex-col items-center rounded-3xl px-5 pt-11 pb-5 text-center lg:top-28"
      @pointerenter="hold"
      @pointerleave="release"
    >
      <!-- the badge stands half over the top edge -->
      <span ref="badge" class="kd-lvl-badge absolute -top-9 left-1/2 grid size-[72px] -translate-x-1/2 place-items-center">
        <img src="/img/brand/level-badge.svg" alt="" class="absolute inset-0 size-full" />
        <UiTextSwap :text="String(shown)" class="relative text-[28px] leading-none font-extrabold text-neutral-1 tabular-nums" />
      </span>
      <span class="type-12-caps kd-lvl-kicker">{{ $t('bonus.levelUp') }}</span>
      <span class="type-28 mt-1 uppercase">{{ $t('bonus.levelTitle', { n: shown }) }}</span>
      <!-- what it means, in one line -->
      <span class="type-14-regular mt-2 text-neutral-14">
        <template v-if="newTier">{{ $t('bonus.levelNewTier', { tier: tierNames[newTier.tier], amount: formatCoins(newTier.value) }) }}</template>
        <template v-else-if="nextTier">{{ $t('bonus.levelToTier', { n: nextTier.fromLevel - shown, tier: tierNames[nextTier.tier] }) }}</template>
        <template v-else-if="ladder.length">{{ $t('bonus.levelTopTier') }}</template>
      </span>
      <UiButton v-if="newTier" variant="gold" size="m" block to="/bonuses" class="mt-4" @click.capture="shown = null">{{ $t('bonus.openBonuses') }}</UiButton>
      <!-- time left before it goes away by itself: a thin bar along the bottom edge -->
      <span class="absolute inset-x-5 bottom-0 h-0.5 overflow-hidden rounded-full bg-white/10">
        <span :key="String(from) + String(shown)" class="kd-lvl-time block h-full" :class="paused && 'is-paused'" :style="{ animationDuration: `${DURATION}ms` }" />
      </span>
    </div>
  </Transition>
</template>

<style scoped>
/* warm and lit: gold light pouring down from the badge over a lifted ground */
.kd-lvl {
  background:
    radial-gradient(80% 70% at 50% 0%, rgb(255 190 70 / 0.42), transparent 75%),
    linear-gradient(180deg, #3a2a12, #24201b);
  box-shadow:
    inset 0 1px 0 rgb(255 220 150 / 0.25),
    0 16px 40px rgb(0 0 0 / 0.55),
    0 0 48px -10px rgb(255 177 59 / 0.55);
}
.kd-lvl-kicker {
  color: var(--color-gold-light);
}
.kd-lvl-badge {
  filter: drop-shadow(0 6px 14px rgb(0 0 0 / 0.45));
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
