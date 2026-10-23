<script setup lang="ts">
import type { BattleResponse, CaseItem, CaseResponse } from '#shared/types/api'

// Battle room, on the case page's skeleton: the mode as the title; a battle bar like the RTP bar (the pot · every
// round as a column with its own fill bar · the seat's cost); one arena; the one main action in a dock under it
// holding every seat's reel, the markers on its edges and, at the end, the result; the player bars under it, each
// player's drops right under their bar, newest first. Fairness lives in the page bar (picked from three layouts,
// 2026-10-24).
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
// false on the server and through hydration (both render desktop), then the real width: a mismatch here left
// hydrated slots with the desktop classes on phones
const mounted = useMounted()
const phoneQuery = useMediaQuery('(max-width: 767px)')
const isMobile = computed(() => mounted.value && phoneQuery.value)

// The player's own result stays on screen after the toast is gone: won the pot, or who took it
const outcome = computed(() => {
  const youSlot = b.value.slots.find((s) => s.player?.you)?.slot
  if (!done.value || youSlot == null || b.value.winnerSlot == null) return null
  if (winners.value.includes(youSlot)) return { won: true, text: t('pvp.youWon', { amount: formatCoins(Math.round(pot.value / winners.value.length)) }) }
  return { won: false, text: t('pvp.youLost', { name: b.value.slots[b.value.winnerSlot]?.player?.nickname ?? '' }) }
})

// The round's best drop rings its rarity once, when the first reel lands (they land together)
let rungRound = -1
function roundLanded() {
  const r = clock.value.round
  if (r === rungRound) return
  rungRound = r
  const drops = b.value.results?.[r]?.drops ?? []
  sfx.reveal(Math.max(0, ...drops.map((d) => RARITY_TIER[d.rarity])))
}

// Celebrate once when the replay finishes
const celebrated = ref(false)
watch(done, (d) => {
  if (!d || celebrated.value || !b.value.results) return
  celebrated.value = true
  const youSlot = b.value.slots.find((s) => s.player?.you)?.slot
  // spectators hear the winner's fanfare, no toast
  if (youSlot == null) return sfx.win()
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

// --- Win chances: the rounds still to come played out SIMS times by the cases' real odds (tickets), judged by the
// mode's rule (most value · least value · the richer team); ties split. 100 / 0 once it is over, even before round 1.
const caseItems = shallowRef<Record<string, CaseItem[]>>({})
onMounted(async () => {
  const slugs = [...new Set(b.value.rounds.map((r) => r.slug))]
  try {
    const got = await Promise.all(slugs.map(async (slug) => [slug, (await $fetch<CaseResponse>(`/api/cases/${slug}`)).case.items] as const))
    caseItems.value = Object.fromEntries(got)
  } catch {
    /* chances stay even */
  }
})
const SIMS = 600
function winnersBy(tt: number[]) {
  if (b.value.mode === 'team') return tt[0]! + tt[1]! >= tt[2]! + tt[3]! ? [0, 1] : [2, 3]
  const pick = b.value.mode === 'crazy' ? Math.min(...tt) : Math.max(...tt)
  return tt.flatMap((v, i) => (v === pick ? [i] : []))
}
const chances = computed<number[]>(() => {
  const n = b.value.size
  if (done.value) return b.value.slots.map((x) => (winners.value.includes(x.slot) ? 100 : 0))
  const even = b.value.slots.map(() => (isTeam.value ? 50 : 100 / n))
  const left = b.value.rounds.slice(revealed.value)
  const items = caseItems.value
  if (left.some((r) => !items[r.slug]?.length)) return even
  const wins = new Array<number>(n).fill(0)
  for (let k = 0; k < SIMS; k++) {
    const tt = [...totals.value]
    for (const r of left) for (let x = 0; x < n; x++) tt[x]! += pickByTickets(items[r.slug]!).price
    const w = winnersBy(tt)
    // a team wins together; tied players share the win
    for (const x of w) wins[x]! += isTeam.value ? 1 : 1 / w.length
  }
  return wins.map((w) => (w / SIMS) * 100)
})
/** The dock's one main action: join a free seat, call a bot to it, or the same battle again once it is over */
const firstFree = computed(() => b.value.slots.find((s) => !s.player)?.slot ?? null)
const cta = computed(() => {
  if (done.value) return { label: t('pvp.recreate'), icon: 'refresh', price: b.value.cost, run: recreate, loading: recreating.value }
  if (b.value.status === 'waiting' && firstFree.value != null) {
    const seat = firstFree.value
    if (!youIn.value) return { label: t('pvp.join'), icon: 'plus', price: b.value.cost, run: () => join(seat) }
    if (isCreator.value) return { label: t('pvp.callBot'), variant: 'secondary' as const, run: () => bot(seat) }
    return { label: t('pvp.waitingForPlayers'), variant: 'secondary' as const, disabled: true }
  }
  return { label: roundLine.value.label, variant: 'secondary' as const, disabled: true }
})
/** A round column's state in the battle bar */
const roundState = (i: number) => (b.value.status === 'waiting' ? 'next' : i < revealed.value ? 'done' : i === roundIdx.value && !done.value && clock.value.round >= 0 ? 'current' : 'next')
/** Under the case strip: the round now, its case and price */
const roundLine = computed(() => {
  const r = b.value.rounds[roundIdx.value]
  if (b.value.status === 'waiting' || clock.value.round < 0) return { label: t('pvp.roundsN', { n: b.value.rounds.length }), r: null }
  if (done.value) return { label: t('pvp.statusFinished'), r: null }
  return { label: `${t('pvp.round')} ${Math.min(b.value.rounds.length, clock.value.round + 1)}/${b.value.rounds.length}`, r }
})

</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <UiPageBar
      :title="$t(`pvp.modeName.${b.mode}`)"
      :subtitle="`${$t(`pvp.modeRule.${b.mode}`)} · #${b.id}`"
      fixed-sides
      :left="[
        { label: $t('pvp.back'), icon: 'arrow-left', to: '/pvp' },
        { label: $t('case.share'), icon: 'share', onClick: shareBattle },
      ]"
    />


    <!-- Battle bar, the case page's RTP bar for a battle: the pot · every round as a column (its case and price, a
         bar that fills while it spins and stays full once it landed) · the seat's cost and who is watching -->
    <section class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 rounded-3xl bg-neutral-2 px-4 py-3 lg:flex lg:gap-12 lg:py-2">
      <div class="flex items-center gap-2 lg:gap-3">
        <span class="type-14-caps whitespace-nowrap text-neutral-11 lg:type-28 lg:uppercase">{{ $t('pvp.value') }}</span>
        <UiPrice :key="pot" :amount="b.status === 'waiting' ? b.cost * b.size : pot" :size="isMobile ? 'xl' : 'xxl'" tone="coin" class="kd-pot tabular-nums" />
      </div>
      <div class="scrollbar-none col-span-2 row-start-2 flex min-w-0 flex-1 gap-3 overflow-x-auto lg:col-span-1 lg:row-start-auto lg:gap-6">
        <div v-for="(r, i) in b.rounds" :key="i" class="kd-round flex min-w-28 flex-1 flex-col gap-1.5" :class="`is-${roundState(i)}`" :title="r.name">
          <div class="flex items-center gap-2">
            <img :src="r.image" :alt="r.name" class="kd-round-img size-9 shrink-0 object-contain" />
            <span class="flex min-w-0 flex-col">
              <span class="type-12-caps truncate text-neutral-12">{{ r.name }}</span>
              <UiPrice :amount="r.price" size="s" />
            </span>
          </div>
          <div class="kd-round-track h-2 overflow-hidden rounded-full">
            <div :key="roundState(i) === 'current' ? `c${clock.round}` : roundState(i)" class="kd-round-bar bg-brand-gradient h-full rounded-full" :style="{ '--round-ms': `${b.roundMs}ms` }" />
          </div>
        </div>
      </div>
      <div class="col-start-2 row-start-1 flex items-center justify-end gap-3 lg:w-44 lg:flex-col lg:items-start lg:justify-center lg:gap-1 lg:border-l lg:border-neutral-4 lg:pl-6">
        <span class="type-12-caps text-neutral-12">{{ $t('pvp.cost') }}</span>
        <span class="flex items-center gap-3">
          <UiPrice :amount="b.cost" size="m" />
          <span class="type-12 flex items-center gap-1 text-neutral-11 tabular-nums"><UiIcon name="eye" :size="14" />{{ b.viewers }}</span>
        </span>
      </div>
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
            :voiced="s.slot === 0"
            @landed="roundLanded"
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
        </div>
      </Transition>
    </section>

    <!-- Dock under the stage, as on the case page: who is watching · the one main action · replay -->
    <div class="flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-3">
      <span class="type-12-caps flex items-center gap-1.5 text-neutral-11 tabular-nums max-lg:hidden"><UiIcon name="eye" :size="16" />{{ b.viewers }} {{ $t('pvp.watching') }}</span>
      <UiButton size="l" class="w-full lg:h-14 lg:w-80" :variant="cta.variant ?? 'primary'" :disabled="cta.disabled" :loading="cta.loading" @click="cta.run?.()">
        <UiIcon v-if="cta.icon" :name="cta.icon" :size="20" />
        <span class="tabular-nums">{{ cta.label }}</span>
        <span v-if="cta.price != null" class="btn-value"><UiPrice :amount="cta.price" size="m" tone="inverse" /></span>
      </UiButton>
      <div class="flex justify-end gap-2">
        <UiChip v-if="data!.battle.status === 'finished'" size="m" icon="refresh" class="max-lg:flex-1" @click="replay">{{ $t('pvp.replay') }}</UiChip>
      </div>
    </div>

    <!-- Player bars: who sits where and what they have so far; join or call a bot on a free seat -->
    <section class="grid gap-2 md:gap-4" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
      <PvpPlayerSlot
        v-for="s in b.slots"
        :key="s.slot"
        :player="s.player"
        :total="totals[s.slot]"
        :winner="done && winners.includes(s.slot)"
        :lead="leaders.includes(s.slot)"
        :chance="s.player ? chances[s.slot] : undefined"
        :compact="isMobile"
        :can-join="!s.player && b.status === 'waiting' && !youIn"
        :can-call-bot="!s.player && b.status === 'waiting' && isCreator"
        @join="join(s.slot)"
        @bot="bot(s.slot)"
      />
    </section>

    <!-- Drops: each player's column under their card, newest first -->
    <section v-if="revealed > 0" class="flex flex-col gap-4">
      <UiSectionHeader :title="$t('pvp.drops')" />
      <div class="grid gap-2 md:gap-4" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
        <TransitionGroup v-for="seat in b.slots" :key="seat.slot" tag="div" name="kd-drop" class="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(110px,1fr))] content-start gap-2">
          <ItemTile v-for="ri in Array.from({ length: revealed }, (_, k) => revealed - 1 - k)" :key="ri" :item="b.results![ri]!.drops[seat.slot]!" readonly />
        </TransitionGroup>
      </div>
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
/* battle bar: a round's bar fills over its spin, stays full once it landed; the case dims when it is spent */
.kd-round-track {
  background: var(--color-neutral-4);
}
.kd-round-bar {
  width: 0;
}
.kd-round.is-done .kd-round-bar {
  width: 100%;
}
.kd-round.is-current .kd-round-bar {
  animation: kd-round-fill var(--round-ms) linear both;
}
@keyframes kd-round-fill {
  to {
    width: 100%;
  }
}
.kd-round.is-done .kd-round-img {
  opacity: 0.5;
}
.kd-round.is-current .kd-round-img {
  filter: drop-shadow(0 0 10px rgb(255 95 31 / 0.6));
}
.kd-pot {
  animation: kd-pot 500ms var(--ease-spring);
}
@keyframes kd-pot {
  from {
    transform: scale(1.12);
  }
}
</style>
