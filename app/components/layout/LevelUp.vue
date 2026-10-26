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
const program = computed(() => bonuses.value?.level ?? null)
/** The rank this level just reached (it starts at this level), else null */
const newRank = computed(() => program.value?.ranks.find((r) => r.fromLevel === shown.value && r.rank > 0) ?? null)
/** The level case this level earned */
const earned = computed(() => program.value?.levelCases.find((c) => c.level === shown.value) ?? null)
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
        <!-- the badge drawn here as one clean vector (no mask, no blurred shadow: they made its edges noisy), with a
             shine sweeping across it now and then -->
        <svg viewBox="0 0 24 24" class="absolute inset-0 size-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="kd-lvl-fill" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stop-color="#FFB547" />
              <stop offset="1" stop-color="#FF5F1F" />
            </linearGradient>
            <clipPath id="kd-lvl-clip"><path d="M5.24156 2.96325C6.87757 0.129591 10.501 -0.841287 13.3346 0.794728L21.0367 5.24156C23.8704 6.87757 24.8413 10.501 23.2053 13.3346L18.7584 21.0367C17.1224 23.8704 13.499 24.8413 10.6654 23.2053L2.96325 18.7584C0.129591 17.1224 -0.841287 13.499 0.794728 10.6654L5.24156 2.96325Z" /></clipPath>
          </defs>
          <path d="M5.24156 2.96325C6.87757 0.129591 10.501 -0.841287 13.3346 0.794728L21.0367 5.24156C23.8704 6.87757 24.8413 10.501 23.2053 13.3346L18.7584 21.0367C17.1224 23.8704 13.499 24.8413 10.6654 23.2053L2.96325 18.7584C0.129591 17.1224 -0.841287 13.499 0.794728 10.6654L5.24156 2.96325Z" fill="url(#kd-lvl-fill)" />
          <g clip-path="url(#kd-lvl-clip)">
            <g transform="rotate(22 12 12)"><rect class="kd-lvl-shine" x="-10" y="-6" width="5" height="36" fill="#fff" opacity="0.5" /></g>
          </g>
          <path d="M5.24156 2.96325C6.87757 0.129591 10.501 -0.841287 13.3346 0.794728L21.0367 5.24156C23.8704 6.87757 24.8413 10.501 23.2053 13.3346L18.7584 21.0367C17.1224 23.8704 13.499 24.8413 10.6654 23.2053L2.96325 18.7584C0.129591 17.1224 -0.841287 13.499 0.794728 10.6654L5.24156 2.96325Z" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="0.6" />
        </svg>
        <UiTextSwap :text="String(shown)" class="relative text-[28px] leading-none font-extrabold text-neutral-1 tabular-nums" />
      </span>
      <span class="type-12-caps kd-lvl-kicker">{{ $t('bonus.levelUp') }}</span>
      <span class="type-28 mt-1 uppercase">{{ $t('bonus.levelTitle', { n: shown }) }}</span>
      <!-- what it means, in one line -->
      <span class="type-14-regular mt-2 text-neutral-14">
        <template v-if="newRank">{{ $t('bonus.levelNewRank', { rank: newRank.name, pct: `${+(newRank.rakebackBp / 100).toFixed(1)}%` }) }}</template>
        <template v-else-if="earned">{{ $t('bonus.levelCaseEarned', { amount: formatCoins(earned.price) }) }}</template>
      </span>
      <UiButton v-if="earned" size="m" block to="/bonuses" class="mt-4" @click.capture="shown = null">{{ $t('bonus.openLevelCase') }}</UiButton>
      <!-- time left before it goes away by itself: a thin bar along the bottom edge -->
      <span class="absolute inset-x-5 bottom-0 h-0.5 overflow-hidden rounded-full bg-white/10">
        <span :key="String(from) + String(shown)" class="kd-lvl-time block h-full" :class="paused && 'is-paused'" :style="{ animationDuration: `${DURATION}ms` }" />
      </span>
    </div>
  </Transition>
</template>

<style scoped>
/* warm grey: the orange of the badge at the top, settling into the site's grey at the foot; no outer glow (its haze
   read as noise around the edges), just a plain shadow under it */
.kd-lvl {
  background: linear-gradient(180deg, #6a3a17 0%, #3b2d24 42%, #2a2a2e 100%);
  box-shadow:
    inset 0 1px 0 rgb(255 210 150 / 0.22),
    0 16px 40px rgb(0 0 0 / 0.55);
}
.kd-lvl-kicker {
  color: var(--color-gold-light);
}
.kd-lvl-badge {
  animation:
    kd-lvl-pop 520ms var(--ease-out) 380ms both,
    kd-lvl-bob 2.6s var(--ease-in-out) 1.1s infinite;
}
/* alive while it is up: the badge rides up and down a little… */
@keyframes kd-lvl-bob {
  50% {
    transform: translateY(-4px);
  }
}
/* …and a shine sweeps across it every few seconds */
.kd-lvl-shine {
  animation: kd-lvl-shine 2.8s var(--ease-in-out) 0.9s infinite;
}
@keyframes kd-lvl-shine {
  0% {
    transform: translateX(0);
  }
  45%,
  100% {
    transform: translateX(40px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-lvl-badge,
  .kd-lvl-shine {
    animation: none;
  }
}
/* the pop grows the badge up to its own size, never past it, and the bob only moves it: a raster scaled up or
   turned shows its pixels at the edges */
@keyframes kd-lvl-pop {
  0% {
    scale: 0.6;
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
