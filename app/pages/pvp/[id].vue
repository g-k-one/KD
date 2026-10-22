<script setup lang="ts">
import type { BattleResponse } from '#shared/types/api'

// Battle room: round strip, one column per seat (player header → reel → won drops), PF strip.
const route = useRoute()
const id = computed(() => String(route.params.id))
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()
const sfx = useSfx()

const { data, refresh, error } = await useFetch<BattleResponse>(() => `/api/battles/${id.value}`, { key: `battle-${id.value}` })
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Battle not found', fatal: true })
const b = computed(() => data.value!.battle)
useHead({ title: () => `PvP #${id.value} · KurwaDROP` })

// Poll while waiting so other players and bots show up
const { pause, resume } = useIntervalFn(() => refresh(), 2500, { immediate: false })
watch(
  () => b.value.status,
  (s) => (s === 'finished' ? pause() : resume()),
  { immediate: true },
)

// Replay clock
const now = useClock(200)
const clock = computed(() => battleClock(b.value, now.value))
const done = computed(() => b.value.status === 'finished' || clock.value.round >= b.value.rounds.length)
const roundIdx = computed(() => Math.min(b.value.rounds.length - 1, Math.max(0, clock.value.round)))
/** Rounds whose result is visible: the current one counts once its reel has stopped */
const revealed = computed(() => {
  if (done.value) return b.value.rounds.length
  if (clock.value.round < 0) return 0
  return clock.value.round + (clock.value.inRound > b.value.roundMs - 900 ? 1 : 0)
})
const totals = computed(() => slotTotals(b.value, revealed.value))
const pot = computed(() => totals.value.reduce((a, x) => a + x, 0))
const groups = computed(() => groupRounds(b.value.rounds))
const isMobile = useMediaQuery('(max-width: 767px)')

// The player's own result stays on screen after the toast is gone: won the pot, or who took it
const outcome = computed(() => {
  const youSlot = b.value.slots.find((s) => s.player?.you)?.slot
  if (!done.value || youSlot == null || b.value.winnerSlot == null) return null
  if (b.value.winnerSlot === youSlot) return { won: true, text: t('pvp.youWon', { amount: formatCoins(pot.value) }) }
  return { won: false, text: t('pvp.youLost', { name: b.value.slots[b.value.winnerSlot]?.player?.nickname ?? '' }) }
})

// Celebrate once when the replay finishes
const celebrated = ref(false)
watch(done, (d) => {
  if (!d || celebrated.value || !b.value.results) return
  celebrated.value = true
  const youSlot = b.value.slots.find((s) => s.player?.you)?.slot
  if (youSlot == null) return
  if (b.value.winnerSlot === youSlot) {
    sfx.reveal(true)
    toast.show(t('pvp.youWon', { amount: formatCoins(pot.value) }), 'success', 5000)
    session.fetchMe()
  } else {
    sfx.lose()
    const w = b.value.slots[b.value.winnerSlot ?? 0]?.player
    toast.show(t('pvp.youLost', { name: w?.nickname ?? '' }), 'danger', 5000)
  }
})

// 3-2-1 before the first round (Key-Drop's hex countdown)
const countdown = computed(() =>
  b.value.status !== 'waiting' && b.value.startedAt && clock.value.round < 0 ? Math.max(0, Math.ceil((Date.parse(b.value.startedAt) - now.value) / 1000)) : 0,
)
watch(countdown, (n, old) => n > 0 && n !== old && sfx.count(n === 1))

// Same cases and seats in one click once the battle is over (Skin.club "Recreate")
const recreating = ref(false)
async function recreate() {
  if (!session.user) return ui.openSignIn()
  recreating.value = true
  try {
    const qty: Record<string, number> = {}
    b.value.rounds.forEach((r) => (qty[r.slug] = (qty[r.slug] ?? 0) + 1))
    const res = await $fetch<BattleResponse>('/api/battles', {
      method: 'POST',
      body: { size: b.value.size, cases: Object.entries(qty).map(([slug, n]) => ({ slug, qty: n })) },
    })
    if (res.balance != null) session.user.balance = res.balance
    await navigateTo(`/pvp/${res.battle.id}`)
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 402) ui.openDeposit()
    else toast.error(e, t('common.error'))
  } finally {
    recreating.value = false
  }
}

const isCreator = computed(() => !!b.value.slots[0]?.player?.you)
const youIn = computed(() => b.value.slots.some((s) => s.player?.you))

async function join(slot: number) {
  if (!session.user) return ui.openSignIn()
  try {
    const res = await $fetch<BattleResponse>(`/api/battles/${id.value}/join`, { method: 'POST', body: { slot } })
    data.value = res
    if (session.user && res.balance != null) session.user.balance = res.balance
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 402) ui.openDeposit()
    else toast.error(e, t('common.error'))
  }
}
async function bot(slot: number) {
  try {
    data.value = await $fetch<BattleResponse>(`/api/battles/${id.value}/bot`, { method: 'POST', body: { slot } })
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 402) ui.openDeposit()
    else toast.error(e, t('common.error'))
  }
}

const short = (s?: string | null) => (s ? `${s.slice(0, 10)}…${s.slice(-10)}` : '—')
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-0 lg:pt-10">
    <UiPageBar
      logo
      :subtitle="`${$t(`pvp.modes.${b.size}`)} · #${b.id}`"
      :left="[{ label: $t('pvp.back'), icon: 'arrow-left', to: '/pvp' }]"
      :right="[{ label: $t('pvp.howItWorks'), icon: 'shield', to: '/fairness' }]"
    />

    <!-- Rounds strip (Figma "BattleRounds") -->
    <section class="flex flex-col gap-3 rounded-3xl bg-neutral-2 p-4 md:flex-row md:items-center md:gap-6 md:px-5">
      <div class="flex items-baseline gap-2 md:flex-col md:gap-0">
        <span class="type-12-regular text-neutral-11">{{ $t('pvp.round') }}</span>
        <span class="type-16-caps tabular-nums">{{ Math.min(b.rounds.length, Math.max(1, clock.round + 1)) }} / {{ b.rounds.length }}</span>
      </div>
      <div class="scrollbar-none flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
        <PvpCaseThumb
          v-for="(r, i) in b.rounds"
          :key="i"
          :image="r.image"
          :name="r.name"
          :size="isMobile ? 's' : 'm'"
          :state="b.status === 'waiting' ? 'default' : i < revealed ? 'done' : i === roundIdx && !done ? 'current' : 'default'"
        />
      </div>
      <div class="flex flex-col items-start md:items-end">
        <UiPrice :key="pot" :amount="b.status === 'waiting' ? b.cost * b.size : pot" size="l" class="kd-pot" />
        <span class="type-12-regular text-neutral-11">{{ $t('pvp.value') }}</span>
      </div>
      <Transition name="kd-recreate">
        <span
          v-if="outcome"
          class="type-12-caps flex h-10 items-center rounded-lg px-3"
          :class="outcome.won ? 'bg-success-24 text-success' : 'bg-danger-24 text-danger'"
        >
          {{ outcome.text }}
        </span>
      </Transition>
      <Transition name="kd-recreate">
        <UiButton v-if="done" size="m" icon="refresh" :loading="recreating" class="kd-recreate" @click="recreate">
          {{ $t('pvp.recreate') }}
          <span class="btn-value"><UiPrice :amount="b.cost" size="s" tone="inverse" /></span>
        </UiButton>
      </Transition>
    </section>

    <!-- Seats -->
    <section class="relative grid gap-2 md:gap-4" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
      <!-- One card per seat: player, reel, won drops — the same surface and spacing for every seat -->
      <div v-for="s in b.slots" :key="s.slot" class="kd-seat flex min-w-0 flex-col gap-2 rounded-[18px] bg-neutral-2 p-1.5 md:gap-3 md:rounded-5xl md:p-3" :class="done && b.winnerSlot === s.slot && 'is-winner'">
        <PvpPlayerSlot
          :player="s.player"
          :total="totals[s.slot]"
          :winner="done && b.winnerSlot === s.slot"
          :compact="isMobile"
          :can-join="!s.player && b.status === 'waiting' && !youIn"
          :can-call-bot="!s.player && b.status === 'waiting' && isCreator"
          @join="join(s.slot)"
          @bot="bot(s.slot)"
        />
        <PvpReel
          :case-ref="b.rounds[roundIdx] ?? null"
          :target="clock.round >= 0 || done ? (b.results?.[roundIdx]?.drops[s.slot] ?? null) : null"
          :spin-key="done ? 'done' : `${clock.round}`"
          :spin-ms="b.roundMs - 1300"
          :instant="done"
          :compact="isMobile"
          :waiting="b.status === 'waiting' || (clock.round < 0 && !done)"
        />
        <!-- Won drops, newest first: the same skin card as the inventory and the stake -->
        <TransitionGroup tag="div" name="kd-drop" class="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-1.5">
          <ItemTile v-for="ri in Array.from({ length: revealed }, (_, k) => revealed - 1 - k)" :key="ri" :item="b.results![ri]!.drops[s.slot]!" readonly />
        </TransitionGroup>
      </div>

      <span class="type-12 flex items-center gap-1.5 text-neutral-11 tabular-nums"><UiIcon name="eye" :size="16" />{{ b.viewers }} {{ $t('pvp.watching') }}</span>

      <!-- Countdown hex, flips on every second -->
      <div v-if="countdown > 0" class="pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-center md:top-32">
        <span :key="countdown" class="kd-count grid size-20 place-items-center md:size-24">
          <span class="type-48-caps text-success">{{ countdown }}</span>
        </span>
      </div>
    </section>

    <!-- Provably fair strip (Figma "BattleSeeds") -->
    <section class="flex flex-col gap-3 rounded-3xl bg-neutral-2 p-4 md:flex-row md:items-center md:gap-6 md:px-5">
      <UiIcon name="shield" :size="20" class="hidden text-neutral-13 md:block" />
      <dl class="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-1 md:flex md:gap-6">
        <div class="contents md:flex md:flex-col md:gap-0.5">
          <dt class="type-12-regular text-neutral-11">{{ b.seed.serverSeed ? $t('pvp.serverSeed') : $t('pvp.serverSeedHash') }}</dt>
          <dd class="type-14 truncate" :class="b.seed.serverSeed && 'text-success'">{{ short(b.seed.serverSeed ?? b.seed.serverSeedHash) }}</dd>
        </div>
        <div class="contents md:flex md:flex-col md:gap-0.5">
          <dt class="type-12-regular text-neutral-11">{{ $t('pvp.eosBlock') }}</dt>
          <dd class="type-14">{{ b.seed.eosBlock ? `#${b.seed.eosBlock.toLocaleString('en-US').replace(/,/g, ' ')}` : $t('pvp.eosPending') }}</dd>
        </div>
        <div class="contents md:flex md:flex-col md:gap-0.5">
          <dt class="type-12-regular text-neutral-11">{{ $t('pvp.pvpId') }}</dt>
          <dd class="type-14">{{ b.id }}</dd>
        </div>
      </dl>
      <UiButton :variant="b.seed.serverSeed ? 'fair' : 'secondary'" size="s" :icon="b.seed.serverSeed ? 'check-circle' : 'info'" to="/fairness">
        {{ b.seed.serverSeed ? $t('pvp.verify') : $t('pvp.howItWorks') }}
      </UiButton>
    </section>
  </div>
</template>

<style scoped>
.kd-count {
  clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%);
  background: radial-gradient(circle, rgb(18 183 106 / 0.35), var(--color-neutral-2) 70%);
  box-shadow: inset 0 0 0 2px var(--color-success);
  animation: kd-count-flip 900ms var(--ease-out) both;
}
@keyframes kd-count-flip {
  0% {
    opacity: 0;
    transform: scale(1.6) rotateY(90deg);
  }
  30% {
    opacity: 1;
    transform: scale(1) rotateY(0);
  }
  85% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(0.85);
  }
}
.kd-recreate-enter-active {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-recreate-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.9);
}
.kd-pot {
  animation: kd-pot 500ms var(--ease-spring);
}
@keyframes kd-pot {
  from {
    transform: scale(1.12);
  }
}
.kd-drop-enter-active {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-drop-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.9);
}
.kd-drop-move {
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-seat {
  transition: box-shadow var(--dur-slow) var(--ease-out);
}
.kd-seat.is-winner {
  box-shadow:
    inset 0 0 0 1px rgb(18 183 106 / 0.35),
    0 0 40px -12px rgb(18 183 106 / 0.6);
}
</style>
