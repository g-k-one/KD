<script setup lang="ts">
import type { BattleResponse } from '#shared/types/api'

// Battle room (skin.fans race): the mode as a 3D wordmark with its rule; the pot as one huge number; the players as a
// podium of big cards, each over its own reel (the leader stands raised, places #1…#n by the mode's rule); one arena
// for the reels with the result inside it; the rounds as identical rows — the round's case, each player's drop in
// that player's column; the PF strip.
const route = useRoute()
const id = computed(() => String(route.params.id))
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()
const sfx = useSfx()

const { data, refresh, error } = await useFetch<BattleResponse>(() => `/api/battles/${id.value}`, { key: `battle-${id.value}` })
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Battle not found', fatal: true })
// Replay (#7): a finished battle plays again from the countdown — on a tap, or for anyone opening a shared
// ?replay=1 link. The room just runs its own clock from now.
const replayAt = ref<number | null>(route.query.replay ? Date.now() : null)
const b = computed(() => {
  const x = data.value!.battle
  return replayAt.value && x.status === 'finished' ? { ...x, status: 'live' as const, startedAt: new Date(replayAt.value + 3500).toISOString() } : x
})
const router = useRouter()
const replayLink = () => new URL(router.resolve({ path: `/pvp/${id.value}`, query: { replay: '1' } }).href, location.href).href
async function shareBattle() {
  try {
    await navigator.clipboard.writeText(replayLink())
    toast.show(t('pvp.linkCopied'), 'success')
  } catch {
    toast.show(replayLink())
  }
}
function replay() {
  celebrated.value = true
  replayAt.value = Date.now()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
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
  if (winners.value.includes(youSlot)) return { won: true, text: t('pvp.youWon', { amount: formatCoins(Math.round(pot.value / winners.value.length)) }) }
  return { won: false, text: t('pvp.youLost', { name: b.value.slots[b.value.winnerSlot]?.player?.nickname ?? '' }) }
})

// Celebrate once when the replay finishes
const celebrated = ref(false)
watch(done, (d) => {
  if (!d || celebrated.value || !b.value.results) return
  celebrated.value = true
  const youSlot = b.value.slots.find((s) => s.player?.you)?.slot
  if (youSlot == null) return
  if (winners.value.includes(youSlot)) {
    sfx.win()
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

const nameOf = (slot: number) => {
  const p = b.value.slots[slot]?.player
  return p ? (p.you ? t('pvp.you') : p.nickname) : ''
}
/** Who took the pot: one name, or "A & B" for a team */
const winners = computed(() => b.value.winners ?? (b.value.winnerSlot != null ? [b.value.winnerSlot] : []))
const winnerName = computed(() => (winners.value.length > 1 ? t('pvp.teamWon', { a: nameOf(winners.value[0]!), b: nameOf(winners.value[1]!) }) : t('pvp.wonBy', { name: nameOf(winners.value[0] ?? 0) })))
/** The seats ahead right now by the mode's rule (most value · least value · the richer team) */
const leaders = computed(() => {
  if (done.value || revealed.value < 1) return [] as number[]
  const tt = totals.value
  if (b.value.mode === 'team') return tt[0]! + tt[1]! >= tt[2]! + tt[3]! ? [0, 1] : [2, 3]
  const pick = b.value.mode === 'crazy' ? Math.min(...tt) : Math.max(...tt)
  return [tt.indexOf(pick)]
})
const isTeam = computed(() => b.value.mode === 'team')
/** Place of every seat right now by the mode's rule (team: both players of a team share its place); null before round 1 */
const ranks = computed<(number | null)[]>(() => {
  if (revealed.value < 1) return b.value.slots.map(() => null)
  const tt = totals.value
  const score = b.value.mode === 'team' ? tt.map((_, i) => (i < 2 ? tt[0]! + tt[1]! : tt[2]! + tt[3]!)) : tt
  const better = (x: number, y: number) => (b.value.mode === 'crazy' ? x < y : x > y)
  return score.map((v) => 1 + new Set(score.filter((o) => better(o, v))).size)
})
const potShown = useTransition(computed(() => (b.value.status === 'waiting' ? b.value.cost * b.value.size : pot.value)), { duration: 800, transition: [0.22, 1, 0.36, 1] })
const pad2 = (n: number) => String(n).padStart(2, '0')

const short = (s?: string | null) => (s ? `${s.slice(0, 10)}…${s.slice(-10)}` : '—')
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-0 lg:pt-10">
    <UiPageBar
      fixed-sides
      :left="[
        { label: $t('pvp.back'), icon: 'arrow-left', to: '/pvp' },
        { label: $t('case.share'), icon: 'share', onClick: shareBattle },
        ...(data!.battle.status === 'finished' ? [{ label: $t('pvp.replay'), icon: 'refresh', onClick: replay }] : []),
      ]"
    >
      <span class="type-12-caps text-neutral-11 tabular-nums">#{{ b.id }}</span>
    </UiPageBar>

    <!-- Hero: the mode as a 3D wordmark, its rule, then the pot as the one huge number -->
    <section class="flex flex-col items-center gap-2 text-center">
      <PvpModeMark :key="b.mode" :mode="b.mode" :text="$t(`pvp.modeName.${b.mode}`).toUpperCase()" :beat="clock.round" />
      <span class="type-12-caps text-neutral-11">{{ $t(`pvp.modeRule.${b.mode}`) }}</span>
      <span class="kd-pot mt-2 flex items-center gap-3">
        <img src="/img/brand/coin.svg" alt="" class="size-8 lg:size-12" />
        <span class="kd-pot-num tabular-nums">{{ formatCoins(Math.round(potShown)) }}</span>
      </span>
      <span class="type-12-caps flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-neutral-11">
        <span>{{ $t('pvp.value') }}</span>
        <span>{{ $t('pvp.cost') }} <UiPrice :amount="b.cost" size="s" class="inline-flex align-middle" /></span>
        <span class="tabular-nums">{{ $t('pvp.rounds') }} {{ Math.min(b.rounds.length, revealed) }}/{{ b.rounds.length }}</span>
        <span class="flex items-center gap-1 tabular-nums"><UiIcon name="eye" :size="14" />{{ b.viewers }}</span>
      </span>
    </section>

    <!-- Podium: one big card per seat, over that seat's reel; the leader stands raised -->
    <section class="grid items-end gap-2 pt-3 md:gap-4" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
      <PvpSeatCard
        v-for="s in b.slots"
        :key="s.slot"
        :player="s.player"
        :total="totals[s.slot]"
        :rank="done ? null : ranks[s.slot]"
        :winner="done && winners.includes(s.slot)"
        :loser="done && !winners.includes(s.slot)"
        :compact="isMobile"
        :can-join="!s.player && b.status === 'waiting' && !youIn"
        :can-call-bot="!s.player && b.status === 'waiting' && isCreator"
        @join="join(s.slot)"
        @bot="bot(s.slot)"
      />
    </section>

    <!-- The arena: every seat's reel side by side in one frame, the markers on its edges -->
    <section class="kd-arena relative overflow-hidden rounded-5xl">
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
        <div v-for="s in b.slots" :key="s.slot" class="kd-arena-seat relative min-w-0" :class="[done && winners.includes(s.slot) && 'is-winner', leaders.includes(s.slot) && 'is-lead', isTeam && s.slot === 2 && 'is-team-split']">
          <span :key="revealed" class="kd-seat-flash pointer-events-none absolute inset-0" aria-hidden="true" />
          <PvpReel
            bare
            :case-ref="b.rounds[roundIdx] ?? null"
            :target="clock.round >= 0 || done ? (b.results?.[roundIdx]?.drops[s.slot] ?? null) : null"
            :spin-key="done ? 'done' : `${clock.round}`"
            :spin-ms="b.roundMs - 1300"
            :instant="done"
            :compact="isMobile"
            :waiting="b.status === 'waiting' || (clock.round < 0 && !done)"
          />
        </div>
      </div>
      <!-- VS between the seats (between the two teams in Team 2v2); it beats on every new round -->
      <div class="pointer-events-none absolute inset-0 z-[3] grid" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }" aria-hidden="true">
        <span v-for="s in b.slots" :key="s.slot" class="relative">
          <span v-if="s.slot > 0 && (!isTeam || s.slot === 2)" :key="`${clock.round}`" class="kd-vs type-12-caps absolute top-1/2 left-0 grid size-9 place-items-center rounded-full" :class="isTeam && 'is-team'">{{ $t('pvp.vs') }}</span>
        </span>
      </div>
      <img src="/img/fx/marker-top.svg" alt="" class="kd-amark absolute top-1/2 left-0 -rotate-90" :class="isMobile ? 'w-3' : 'w-5'" />
      <img src="/img/fx/marker-top.svg" alt="" class="kd-amark absolute top-1/2 right-0 rotate-90" :class="isMobile ? 'w-3' : 'w-5'" />

      <!-- Countdown hex, flips on every second -->
      <div v-if="countdown > 0" class="pointer-events-none absolute inset-0 z-10 grid place-items-center">
        <span :key="countdown" class="kd-count grid size-20 place-items-center md:size-24">
          <span class="type-48-caps text-success">{{ countdown }}</span>
        </span>
      </div>

      <!-- The result, inside the arena: who took the pot, how much, and the same battle again -->
      <Transition name="kd-result">
        <div v-if="done && b.winnerSlot != null" class="kd-arena-result absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <span class="type-12-caps text-neutral-11">{{ $t('pvp.statusFinished') }}</span>
          <span class="kd-result-title type-20-caps">{{ winnerName }}</span>
          <UiPrice :amount="pot" size="l" tone="success" class="kd-result-pot" />
          <span v-if="outcome" class="type-12-caps" :class="outcome.won ? 'text-success' : 'text-danger'">{{ outcome.text }}</span>
          <div class="flex flex-wrap justify-center gap-2">
            <UiButton size="m" icon="refresh" :loading="recreating" @click="recreate">
              {{ $t('pvp.recreate') }}
              <span class="btn-value"><UiPrice :amount="b.cost" size="s" tone="inverse" /></span>
            </UiButton>
            <UiButton v-if="data!.battle.status === 'finished'" variant="secondary" size="m" icon="refresh" @click="replay">{{ $t('pvp.replay') }}</UiButton>
          </div>
        </div>
      </Transition>
    </section>

    <!-- Rounds as identical rows: the round's case, then each player's drop in that player's column -->
    <section class="flex flex-col gap-2">
      <div
        v-for="(r, ri) in b.rounds"
        :key="ri"
        class="kd-round grid items-center gap-2 rounded-3xl p-2 md:gap-4 md:p-3"
        :class="[ri < revealed ? 'is-done' : ri === roundIdx && !done && b.status !== 'waiting' && clock.round >= 0 ? 'is-current' : 'is-next']"
        :style="{ gridTemplateColumns: `${isMobile ? '56px' : '200px'} repeat(${b.size}, minmax(0, 1fr))` }"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span class="kd-round-n font-extrabold italic tabular-nums max-md:hidden">#{{ pad2(ri + 1) }}</span>
          <img :src="r.image" :alt="r.name" class="size-12 shrink-0 object-contain md:size-14" />
          <span class="flex min-w-0 flex-col max-md:hidden">
            <span class="type-12-caps truncate">{{ r.name }}</span>
            <UiPrice :amount="r.price" size="s" tone="muted" />
          </span>
        </div>
        <div v-for="s in b.slots" :key="s.slot" class="flex justify-center">
          <ItemTile v-if="ri < revealed && b.results?.[ri]" :item="b.results[ri]!.drops[s.slot]!" readonly class="kd-slot-in w-full max-w-[120px]" />
          <span v-else class="kd-round-empty grid aspect-[112/132] w-full max-w-[120px] place-items-center rounded-2xl">
            <UiIcon v-if="ri === roundIdx && !done && clock.round >= 0" name="refresh" :size="18" class="kd-spinning text-neutral-11" />
          </span>
        </div>
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
.kd-arena {
  border: 4px solid transparent;
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(180deg, var(--color-neutral-4) 15%, rgb(255 95 31 / 0.85) 50%, var(--color-neutral-4) 85%) border-box;
}
.kd-amark {
  translate: 0 -50%;
  z-index: 2;
}
.kd-arena-seat + .kd-arena-seat {
  border-left: 1px solid var(--color-neutral-4);
}
/* Team 2v2: the line between the teams is the strong one */
.kd-arena-seat.is-team-split {
  border-left: 2px solid rgb(255 95 31 / 0.5);
}
/* the seat ahead gets a warm floor while it leads */
.kd-arena-seat.is-lead {
  background: radial-gradient(70% 45% at 50% 100%, rgb(255 95 31 / 0.14), transparent);
}
/* every landing flashes the seats once (keyed on the round) */
.kd-seat-flash {
  background: radial-gradient(50% 40% at 50% 50%, rgb(255 255 255 / 0.12), transparent);
  opacity: 0;
  animation: kd-seat-flash 700ms var(--ease-out);
}
@keyframes kd-seat-flash {
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
.kd-vs {
  translate: -50% -50%;
  background: var(--color-neutral-2);
  color: var(--color-neutral-13);
  box-shadow: inset 0 0 0 1px var(--color-neutral-5);
  animation: kd-vs 600ms var(--ease-spring);
}
.kd-vs.is-team {
  color: var(--color-brand-light);
  box-shadow: inset 0 0 0 1px rgb(255 95 31 / 0.6), 0 0 16px rgb(255 95 31 / 0.35);
}
@keyframes kd-vs {
  40% {
    scale: 1.3;
  }
}
.kd-result-title {
  animation: kd-result-in 700ms var(--ease-spring) 700ms both;
}
.kd-result-pot {
  animation: kd-result-in 700ms var(--ease-spring) 820ms both;
}
@keyframes kd-result-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.85);
  }
}
.kd-arena-seat {
  transition: background-color var(--dur-slow) var(--ease-out);
}
.kd-arena-seat.is-winner {
  background: radial-gradient(60% 50% at 50% 50%, rgb(18 183 106 / 0.18), transparent);
}
.kd-arena-result {
  background: rgb(12 13 16 / 0.82);
  backdrop-filter: blur(4px);
}
.kd-result-enter-active {
  transition: opacity var(--dur-slow) var(--ease-out) 600ms;
}
.kd-result-enter-from {
  opacity: 0;
}
.kd-slot-in {
  animation: kd-slot-in var(--dur-slow) var(--ease-spring);
}
@keyframes kd-slot-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
}
.kd-pot-num {
  font-size: clamp(40px, 9vw, 88px);
  line-height: 1;
  font-weight: 800;
  background: linear-gradient(180deg, #fff3c4, #f5c649 55%, #c98a10);
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 6px 24px rgb(245 198 73 / 0.35));
}
.kd-round {
  background: var(--color-neutral-2);
  transition:
    opacity var(--dur-slow) var(--ease-out),
    box-shadow var(--dur-slow) var(--ease-out);
}
.kd-round.is-next {
  opacity: 0.45;
}
.kd-round.is-current {
  box-shadow:
    inset 0 0 0 1px rgb(255 95 31 / 0.6),
    0 0 24px -8px rgb(255 95 31 / 0.6);
}
.kd-round-n {
  width: 44px;
  font-size: 22px;
  color: var(--color-neutral-10);
}
.kd-round.is-current .kd-round-n {
  color: var(--color-brand-light);
}
.kd-round-empty {
  background: var(--color-neutral-3);
}
.kd-spinning {
  animation: kd-spin 1s linear infinite;
}
@keyframes kd-spin {
  to {
    rotate: 360deg;
  }
}
</style>
