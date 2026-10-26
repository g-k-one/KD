<script setup lang="ts">
import type { BattleResponse, CaseItem, CaseResponse } from '#shared/types/api'

// Battle room (after csgogem): the mode as the title; one meta line (cost and pot · the case strip · viewers and
// rounds); a short stage so the players and their drops stay on screen; every action once — join / call a bot in
// the seat's bar, recreate and replay in the result
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
const { pause, resume } = useIntervalFn(() => document.visibilityState === 'visible' && refresh(), 2500, { immediate: false })
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
const SIMS = 2000
// one fixed stream of numbers per estimate: the same state always shows the same chance, nothing jitters
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function winnersBy(tt: number[]) {
  if (b.value.mode === 'team') return tt[0]! + tt[1]! >= tt[2]! + tt[3]! ? [0, 1] : [2, 3]
  const pick = b.value.mode === 'crazy' ? Math.min(...tt) : Math.max(...tt)
  return tt.flatMap((v, i) => (v === pick ? [i] : []))
}
const chances = computed<number[]>(() => {
  const n = b.value.size
  if (done.value) return b.value.slots.map((x) => (winners.value.includes(x.slot) ? 100 : 0))
  const even = b.value.slots.map(() => (isTeam.value ? 50 : 100 / n))
  // before the first round everyone is in the same place: exactly even, not a noisy estimate of it
  if (!revealed.value) return even
  const left = b.value.rounds.slice(revealed.value)
  const items = caseItems.value
  if (left.some((r) => !items[r.slug]?.length)) return even
  const rand = seeded(revealed.value * 7919 + n)
  const wins = new Array<number>(n).fill(0)
  for (let k = 0; k < SIMS; k++) {
    const tt = [...totals.value]
    for (const r of left) for (let x = 0; x < n; x++) tt[x]! += pickByTickets(items[r.slug]!, rand).price
    const w = winnersBy(tt)
    // a team wins together; tied players share the win
    for (const x of w) wins[x]! += isTeam.value ? 1 : 1 / w.length
  }
  return wins.map((w) => (w / SIMS) * 100)
})
/** A round's state in the case strip */
const roundState = (i: number) => (b.value.status === 'waiting' ? 'default' : i < revealed.value ? 'done' : i === roundIdx.value && !done.value && clock.value.round >= 0 ? 'current' : 'default')
/** Under the case strip: the round now, its case and price */
const roundLine = computed(() => {
  const r = b.value.rounds[roundIdx.value]
  if (b.value.status === 'waiting' || clock.value.round < 0) return { label: t('pvp.roundsN', { n: b.value.rounds.length }), r: null }
  if (done.value) return { label: t('pvp.statusFinished'), r: null }
  return { label: `${t('pvp.round')} ${Math.min(b.value.rounds.length, clock.value.round + 1)}/${b.value.rounds.length}`, r }
})

</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-5 lg:px-0 lg:pt-10">
    <UiPageBar
      :title="$t(`pvp.modeName.${b.mode}`)"
      :subtitle="`${$t(`pvp.modeRule.${b.mode}`)} · #${b.id}`"
      fixed-sides
      :left="[
        { label: $t('pvp.back'), icon: 'arrow-left', to: '/pvp' },
        { label: $t('case.share'), icon: 'share', onClick: shareBattle },
      ]"
    />


    <!-- Meta line: what a seat costs and what is in the pot · the battle's cases (the current one lit, spent ones dim)
         · who is watching and the round -->
    <section class="kd-dock flex flex-wrap items-center justify-between gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-3">
      <div class="type-12-caps flex gap-2 max-lg:w-full">
        <span class="kd-dock-stat max-lg:flex-1 max-lg:justify-center">{{ $t('pvp.cost') }} <UiPrice :amount="b.cost" size="m" /></span>
        <span class="kd-dock-stat max-lg:flex-1 max-lg:justify-center">{{ $t('pvp.pot') }} <UiPrice :key="pot" :amount="b.status === 'waiting' ? b.cost * b.size : pot" size="m" tone="coin" class="kd-pot tabular-nums" /></span>
      </div>
      <!-- room on every side for the current round's tile, which grows a little: the scroll box must not cut it -->
      <div class="scrollbar-none flex max-w-full items-center gap-2 overflow-x-auto px-1 py-2 max-lg:order-last max-lg:w-full">
        <PvpCaseThumb v-for="(r, i) in b.rounds" :key="i" :image="r.image" :name="`${r.name} · ${formatCoins(r.price)}`" size="m" :state="roundState(i)" />
      </div>
      <div class="type-12-caps flex justify-end gap-2 tabular-nums max-lg:w-full">
        <span class="kd-dock-stat max-lg:flex-1 max-lg:justify-center"><UiIcon name="eye" :size="16" /><span class="text-neutral-15">{{ b.viewers }}</span></span>
        <span class="kd-dock-stat max-lg:flex-1 max-lg:justify-center">{{ $t('pvp.rounds') }} <span class="text-neutral-15">{{ Math.min(b.rounds.length, revealed) }}/{{ b.rounds.length }}</span></span>
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


    <!-- Player bars: who sits where and what they have so far; join or call a bot on a free seat -->
    <section class="grid gap-2 md:gap-4" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
      <PvpPlayerSlot
        v-for="s in b.slots"
        :key="s.slot"
        :player="s.player"
        :total="totals[s.slot]"
        :winner="done && winners.includes(s.slot)"
        :lead="leaders.includes(s.slot)"
        :chance="s.player && !done ? chances[s.slot] : undefined"
        :result="s.player && done ? (winners.includes(s.slot) ? 'won' : 'lost') : undefined"
        :compact="isMobile"
        :can-join="!s.player && b.status === 'waiting' && !youIn"
        :can-call-bot="!s.player && b.status === 'waiting' && isCreator"
        @join="join(s.slot)"
        @bot="bot(s.slot)"
      />
    </section>

    <!-- Drops: each player's right under their bar, newest first -->
    <section v-if="revealed > 0" class="-mt-1">
      <div class="grid gap-2 md:gap-4" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
        <!-- once it is over, the losers' drops step back: they go to the winner -->
        <TransitionGroup v-for="seat in b.slots" :key="seat.slot" tag="div" name="kd-drop" class="kd-seat-drops grid min-w-0 grid-cols-[repeat(auto-fill,minmax(110px,1fr))] content-start gap-2" :class="done && !winners.includes(seat.slot) && 'is-lost'">
          <ItemTile v-for="ri in Array.from({ length: revealed }, (_, k) => revealed - 1 - k)" :key="ri" :item="b.results![ri]!.drops[seat.slot]!" readonly />
        </TransitionGroup>
      </div>
    </section>
  </div>
</template>

<style scoped>
.kd-seat-drops {
  transition: opacity var(--dur-slow) var(--ease-out);
}
.kd-seat-drops.is-lost {
  opacity: 0.4;
}
/* the plate is the case page's dock: 24px radius, 12px padding; its chips are 48px high with a 12px radius (24 − 12) */
.kd-dock {
  border-radius: 24px;
  background: var(--color-neutral-2);
  padding: 12px;
}
@media (min-width: 64rem) {
  .kd-dock {
    padding-inline: 16px;
  }
}
.kd-dock-stat {
  display: inline-flex;
  height: 48px;
  align-items: center;
  gap: 8px;
  border-radius: 12px;
  background: var(--color-neutral-3);
  padding: 0 16px;
  color: var(--color-neutral-11);
  white-space: nowrap;
}
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
.kd-pot {
  animation: kd-pot 500ms var(--ease-spring);
}
@keyframes kd-pot {
  from {
    transform: scale(1.12);
  }
}
</style>
