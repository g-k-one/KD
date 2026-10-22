<script setup lang="ts">
/*
 * Level-up moment (player audit D6). When the level goes up a plate drops in at the top centre:
 *   the level badge (same art as the header) with the number rolling from the old level to the new one,
 *   the reward that is now waiting (real numbers from /api/bonuses) and, on milestones, the daily-case step,
 *   a Claim button that opens Bonuses. A thin bar runs down the time left; hovering holds it.
 * Light: our kdReveal in gold behind the badge.
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
const reward = computed(() => (shown.value ? bonuses.value?.levels.find((l) => l.level === shown.value) ?? null : null))
const tierNames = ['I', 'II', 'III', 'IV']
</script>

<template>
  <Transition name="kd-lvl">
    <div
      v-if="shown"
      class="kd-lvl fixed top-[calc(76px+env(safe-area-inset-top))] left-1/2 z-[66] flex w-[min(360px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-3xl bg-neutral-3 lg:top-24"
      @pointerenter="hold"
      @pointerleave="release"
    >
      <div class="flex items-center gap-4 p-3 pr-4">
        <span ref="badge" class="kd-lvl-badge relative grid size-14 shrink-0 place-items-center">
          <img src="/img/brand/level-badge.svg" alt="" class="absolute inset-0 size-full" />
          <UiTextSwap :text="String(shown)" class="relative text-xl leading-none font-extrabold text-neutral-1 tabular-nums" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-1">
          <span class="type-16-caps kd-lvl-title">{{ $t('bonus.levelUp') }}</span>
          <span v-if="reward" class="flex flex-wrap items-center gap-1.5">
            <UiPrice :amount="reward.coins" size="m" tone="coin" />
            <span v-if="reward.dailyTier" class="type-10-caps rounded-sm bg-warning-24 px-1.5 py-0.5 text-coin">{{ $t('bonus.dailyUp', { tier: tierNames[reward.dailyTier - 1] }) }}</span>
          </span>
        </span>
        <UiButton variant="gold" size="s" to="/bonuses" @click.capture="shown = null">{{ $t('bonus.claim') }}</UiButton>
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
  box-shadow:
    0 12px 32px rgb(0 0 0 / 0.6),
    0 0 40px -12px rgb(255 177 59 / 0.6);
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
.kd-lvl-title {
  background: linear-gradient(90deg, var(--color-gold-light), var(--color-brand-bright));
  background-clip: text;
  color: transparent;
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
