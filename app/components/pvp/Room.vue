<script setup lang="ts">
import type { BattleResponse, CaseItem, CaseResponse } from '#shared/types/api'

// Battle room (after csgogem; the page app/pages/pvp/[id].vue shows it inside a Suspense with its skeleton): the mode as the title; one meta line (cost and pot · the case strip · viewers and
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
if (error.value) {
  const notFound = createError({ statusCode: 404, statusMessage: 'Battle not found', fatal: true })
  if (import.meta.server) throw notFound
  // on a tap the room sits in the page's Suspense: show the 404 and never resolve, so the room is never drawn empty
  showError(notFound)
  await new Promise(() => {})
}
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

// Poll while waiting so other players and bots show up (in the browser only: on the server the timer would outlive the render)
const { pause, resume } = useIntervalFn(() => document.visibilityState === 'visible' && refresh(), 2500, { immediate: false })
watch(
  () => b.value.status,
  (s) => import.meta.client && (s === 'finished' ? pause() : resume()),
  { immediate: true },
)

// Replay clock
const now = useClock(200)
const clock = computed(() => battleClock(b.value, now.value))
const done = computed(() => b.value.status === 'finished' || clock.value.round >= b.value.rounds.length)
const roundIdx = computed(() => Math.min(b.value.rounds.length - 1, Math.max(0, clock.value.round)))
// The round strip shows what fits (a 56 px tile + 8 px gap): a window that keeps the current round in view, faded on
// the side where more rounds are out of view (no "+N" tile, as in the lobby: Rounds 0/6 beside it gives the count)
const stripEl = useTemplateRef<HTMLElement>('stripEl')
const { width: stripW } = useElementSize(() => stripEl.value?.parentElement ?? null)
const strip = computed(() => {
  const n = b.value.rounds.length
  // the strip gets what the cost/pot and the viewers/rounds chips leave of the dock (desktop: its middle column)
  const room = isMobile.value ? stripW.value - 8 : Math.max(0, stripW.value - 2 * 340)
  const fit = Math.max(3, Math.floor((room + 8) / 64))
  if (n <= fit) return { idx: Array.from({ length: n }, (_, i) => i), more: 0, from: 0 }
  const shown = fit
  const from = Math.min(Math.max(0, roundIdx.value - 1), n - shown)
  return { idx: Array.from({ length: shown }, (_, k) => from + k), more: n - (from + shown), from }
})
/** Rounds whose result is visible: the current one counts once its reel has stopped */
const revealed = computed(() => {
  if (done.value) return b.value.rounds.length
  if (clock.value.round < 0) return 0
  return clock.value.round + (clock.value.inRound > b.value.roundMs - 900 ? 1 : 0)
})
const totals = computed(() => slotTotals(b.value, revealed.value))
const pot = computed(() => totals.value.reduce((a, x) => a + x, 0))
// the server and hydration answer at the phone width the ssr-width plugin provides (most players are on phones),
// so a phone gets its own layout from the first paint instead of the desktop one switching after mount
const isMobile = useMediaQuery('(max-width: 767px)')

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

// the seconds before the first round, counted down big over the dimmed arena
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
    // the same mode and the rounds in their order, a case per round, as the create page sends them
    const res = await $fetch<BattleResponse>('/api/battles', {
      method: 'POST',
      body: { mode: b.value.mode, size: b.value.size, cases: b.value.rounds.map((r) => ({ slug: r.slug, qty: 1 })) },
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

// the seat a join or a bot call was sent for, until the server answers
const busySlot = ref<number | null>(null)
async function join(slot: number) {
  if (!session.user) return ui.openSignIn()
  if (busySlot.value != null) return
  busySlot.value = slot
  try {
    const res = await $fetch<BattleResponse>(`/api/battles/${id.value}/join`, { method: 'POST', body: { slot } })
    data.value = res
    // a seat taken: the stake's pluck, a step up for every filled seat
    sfx.select(res.battle.slots.filter((x) => x.player).length)
    if (session.user && res.balance != null) session.user.balance = res.balance
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 402) ui.openDeposit()
    else toast.error(e, t('common.error'))
  } finally {
    busySlot.value = null
  }
}
async function bot(slot: number) {
  if (busySlot.value != null) return
  busySlot.value = slot
  try {
    const res = await $fetch<BattleResponse>(`/api/battles/${id.value}/bot`, { method: 'POST', body: { slot } })
    data.value = res
    sfx.select(res.battle.slots.filter((x) => x.player).length)
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 402) ui.openDeposit()
    else toast.error(e, t('common.error'))
  } finally {
    busySlot.value = null
  }
}

// ?check=1 (a PvP row of the game history): the battle's check opens with the page
const verifyOpen = ref(false)
onMounted(() => route.query.check && (verifyOpen.value = true))
const nameOf = (slot: number) => {
  const p = b.value.slots[slot]?.player
  return p ? (p.you ? t('pvp.you') : p.nickname) : ''
}
/** Who took the pot: one name, or "A & B" for a team */
const winners = computed(() => b.value.winners ?? (b.value.winnerSlot != null ? [b.value.winnerSlot] : []))
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

// The seats below the arena stand on its lines: each column ends where a lane does. The arena's 4 px frame sits outside
// its lanes, so the first and last columns are that much wider than the ones between them
const laneCols = computed(() => {
  const n = b.value.size
  const edge = `calc((100% - 8px) / ${n} + 4px)`
  return [edge, ...Array.from({ length: n - 2 }, () => `calc((100% - 8px) / ${n})`), edge].join(' ')
})
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-0 lg:pt-10">
    <!-- the bar's shield is the general fairness page, as on every page; this battle's own check is Check PvP in the result -->
    <UiPageBar
      class="lg:-mb-2"
      :title="$t(`pvp.modeName.${b.mode}`)"
      :subtitle="`${$t(`pvp.modeRule.${b.mode}`)} · #${b.id}`"
      fixed-sides
      :left="[
        { label: $t('pvp.back'), icon: 'arrow-left', to: '/pvp' },
        { label: $t('case.share'), icon: 'share', onClick: shareBattle },
      ]"
    />


    <!-- Meta line: who is watching and the round · the battle's cases (the current one lit, spent ones dim) · what a
         seat costs and what is in the pot (the money on the right, as in the lobby's plate). Once the battle is over it
         folds away: the result in the arena says the pot, Recreate the cost -->
    <div class="kd-fold" :class="done && 'is-gone'">
    <div class="min-h-0">
    <section class="kd-dock flex flex-wrap items-center justify-between gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-3">
      <div class="type-12-caps flex gap-2 tabular-nums max-lg:w-full">
        <span class="kd-dock-stat max-lg:flex-1 max-lg:justify-center"><UiIcon name="eye" :size="16" /><span class="text-neutral-15">{{ b.viewers }}</span></span>
        <span class="kd-dock-stat max-lg:flex-1 max-lg:justify-center">{{ $t('pvp.rounds') }} <span class="text-neutral-15" data-allow-mismatch="text">{{ Math.min(b.rounds.length, revealed) }}/{{ b.rounds.length }}</span></span>
      </div>
      <!-- As many rounds as fit, none cut: a window that follows the current round, a "+N" tile for the ones after it,
           and a soft fade on the side where earlier rounds went out of view -->
      <div ref="stripEl" class="kd-rounds flex min-w-0 items-center gap-2 overflow-hidden px-1 py-2 max-lg:order-last max-lg:w-full lg:-my-1 lg:max-w-full lg:py-1" :class="[strip.from > 0 && 'is-cut', strip.more > 0 && 'is-more']">
        <PvpCaseThumb v-for="i in strip.idx" :key="i" :image="b.rounds[i]!.image" :name="`${b.rounds[i]!.name} · ${formatCoins(b.rounds[i]!.price)}`" size="m" :state="roundState(i)" />
      </div>
      <div class="type-12-caps flex justify-end gap-2 max-lg:w-full">
        <span class="kd-dock-stat max-lg:flex-1 max-lg:justify-center">{{ $t('pvp.cost') }} <UiPrice :amount="b.cost" size="m" /></span>
        <span class="kd-dock-stat max-lg:flex-1 max-lg:justify-center">{{ $t('pvp.pot') }} <UiPrice :key="pot" :amount="b.status === 'waiting' ? b.cost * b.size : pot" size="m" tone="coin" class="kd-pot tabular-nums" /></span>
      </div>
    </section>
    </div>
    </div>
    <!-- The arena: every seat's reel side by side in one frame, the markers on its edges -->
    <section class="kd-arena relative overflow-hidden rounded-5xl" :class="done && 'is-done'">
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
        <div v-for="s in b.slots" :key="s.slot" class="kd-arena-seat relative min-w-0" :class="[done && winners.includes(s.slot) && 'is-winner', leaders.includes(s.slot) && 'is-lead', isTeam && s.slot === 2 && 'is-team-split']">
          <span :key="revealed" class="kd-seat-flash pointer-events-none absolute inset-0" aria-hidden="true" />
          <!-- a free seat while it waits: an empty lane, no second Join: the action is on the seat's plate under it -->
          <div v-if="!s.player && b.status === 'waiting'" class="grid place-items-center px-2 text-center text-neutral-11" :class="isMobile ? 'h-50' : 'h-72'">
            <span class="kd-free-seat max-w-24 text-balance" :class="isMobile ? 'type-10-caps' : 'type-12-caps'">{{ $t('pvp.waitingForPlayer') }}</span>
          </div>
          <PvpReel
            v-else
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
          <span v-if="countdown <= 0 && s.slot > 0 && (!isTeam || s.slot === 2)" :key="`${clock.round}`" class="kd-vs type-12-caps absolute top-1/2 left-0 grid size-9 place-items-center rounded-full" :class="isTeam && 'is-team'">{{ $t('pvp.vs') }}</span>
        </span>
      </div>
      <img src="/img/fx/marker-top.svg" alt="" class="kd-amark absolute top-1/2 left-0 -rotate-90" :class="isMobile ? 'w-3' : 'w-5'" />
      <img src="/img/fx/marker-top.svg" alt="" class="kd-amark absolute top-1/2 right-0 rotate-90" :class="isMobile ? 'w-3' : 'w-5'" />

      <!-- The countdown: the arena dims and each number lands big in its middle, one beat a second -->
      <Transition name="kd-countdown">
        <div v-if="countdown > 0" class="kd-countdown pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <span :key="countdown" class="kd-count text-[72px] leading-none font-extrabold tabular-nums lg:text-[112px]">{{ countdown }}</span>
        </div>
      </Transition>

      <!-- The result, inside the arena: who took the pot, how much, and the same battle again -->
      <Transition name="kd-result">
        <div v-if="done && b.winnerSlot != null" class="kd-arena-result absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <!-- who took it: their face(s) under a crown, the name, the pot; one 12 px step down the block, the name's caption
               held to it -->
          <div class="kd-result-title flex flex-col items-center gap-4">
            <span v-if="!isMobile" class="flex -space-x-3">
              <span v-for="w in winners" :key="w" class="kd-result-face relative block overflow-hidden rounded-full bg-neutral-7" :class="isMobile ? 'size-12' : 'size-16'">
                <img :src="b.slots[w]?.player?.avatar" alt="" class="size-full object-cover" :class="b.slots[w]?.player?.bot && 'scale-75 object-contain'" />
              </span>
            </span>
            <span class="flex flex-col items-center">
              <span class="type-12-caps text-success">{{ winners.length > 1 ? $t('pvp.battleWonTeam') : $t('pvp.battleWon') }}</span>
              <span class="text-[22px] leading-7 font-extrabold uppercase lg:type-28">{{ winners.map(nameOf).join(' & ') }}</span>
            </span>
          </div>
          <UiPrice :amount="pot" :size="isMobile ? 'l' : 'xl'" tone="coin" class="kd-result-pot" />
          <div class="kd-result-pot mt-1 flex flex-wrap justify-center gap-2">
            <UiButton size="m" icon="refresh" :loading="recreating" @click="recreate">
              {{ $t('pvp.recreate') }}
              <span class="btn-value"><UiPrice :amount="b.cost" size="s" tone="inverse" /></span>
            </UiButton>
            <!-- phones: Replay and Check as icons, so the row fits the arena -->
            <UiButton v-if="data!.battle.status === 'finished'" variant="secondary" size="m" icon="demo" :icon-only="isMobile" :aria-label="$t('pvp.replay')" @click="replay">
              <template v-if="!isMobile">{{ $t('pvp.replay') }}</template>
            </UiButton>
            <UiButton variant="fair" size="m" icon="shield-check" :icon-only="isMobile" :aria-label="$t('pvp.checkBattle')" @click="verifyOpen = true">
              <template v-if="!isMobile">{{ $t('pvp.checkBattle') }}</template>
            </UiButton>
          </div>
        </div>
      </Transition>
    </section>


    <!-- Player bars: who sits where and what they have so far; join or call a bot on a free seat -->
    <section class="kd-lanes lg:-mt-3" :style="{ gridTemplateColumns: laneCols }">
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
        :busy="busySlot === s.slot"
        @join="join(s.slot)"
        @bot="bot(s.slot)"
      />
    </section>

    <!-- Drops: each player's right under their bar, newest first -->
    <section v-if="revealed > 0" class="-mt-1 lg:-mt-3">
      <div class="kd-lanes" :style="{ gridTemplateColumns: laneCols }">
        <!-- once it is over, the losers' drops step back: they go to the winner -->
        <TransitionGroup v-for="seat in b.slots" :key="seat.slot" tag="div" name="kd-drop" class="kd-seat-drops grid min-w-0 grid-cols-[repeat(auto-fill,minmax(76px,1fr))] content-start gap-2 sm:grid-cols-[repeat(auto-fill,minmax(110px,1fr))]" :class="done && !winners.includes(seat.slot) && 'is-lost'">
          <ItemTile v-for="ri in Array.from({ length: revealed }, (_, k) => revealed - 1 - k)" :key="ri" :item="b.results![ri]!.drops[seat.slot]!" readonly />
        </TransitionGroup>
      </div>
    </section>
    <PvpVerifyModal v-model="verifyOpen" :battle="b" />
  </div>
</template>

<style scoped>
/* a column to each lane; the gap between two seats is split evenly around the arena's line */
.kd-lanes {
  --lane-gap: 8px;
  display: grid;
}
@media (min-width: 48rem) {
  .kd-lanes {
    --lane-gap: 16px;
  }
}
@media (min-width: 64rem) {
  .kd-lanes {
    --lane-gap: 24px;
  }
}
.kd-lanes > * {
  min-width: 0;
  margin-inline: calc(var(--lane-gap) / 2);
}
.kd-lanes > :first-child {
  margin-left: 0;
}
.kd-lanes > :last-child {
  margin-right: 0;
}
/* earlier rounds went out of view on the left: the first tile fades in from the edge */
.kd-rounds.is-cut {
  mask-image: linear-gradient(90deg, transparent, #000 48px);
}
.kd-rounds.is-more {
  mask-image: linear-gradient(90deg, #000 calc(100% - 48px), transparent);
}
.kd-rounds.is-cut.is-more {
  mask-image: linear-gradient(90deg, transparent, #000 48px, #000 calc(100% - 48px), transparent);
}
.kd-seat-drops {
  transition: opacity var(--dur-slow) var(--ease-out);
}
.kd-seat-drops.is-lost {
  opacity: 0.4;
}
/* the free seat breathes while it waits */
.kd-free-seat {
  animation: kd-free-seat 2400ms ease-in-out infinite;
}
@keyframes kd-free-seat {
  50% {
    opacity: 0.5;
  }
}
/* the meta line folds away when the battle is over (rows to 0 and the column's gap taken back) */
.kd-fold {
  display: grid;
  grid-template-rows: 1fr;
  transition:
    grid-template-rows var(--dur-slow) var(--ease-out),
    opacity var(--dur-base) var(--ease-out),
    margin var(--dur-slow) var(--ease-out);
}
.kd-fold > div {
  overflow: hidden;
}
.kd-fold.is-gone {
  grid-template-rows: 0fr;
  opacity: 0;
  margin-bottom: -16px;
}
@media (min-width: 64rem) {
  .kd-fold.is-gone {
    margin-bottom: -20px;
  }
}
/* the plate is the case page's dock: 24px radius, 12px padding; its chips are 48px high with a 12px radius (24 − 12) */
.kd-dock {
  border-radius: 24px;
  background: var(--color-neutral-2);
  padding: 12px;
}
/* desktop: the docks' 80 px and 16 px sides: the 48 px chips sit 16 px from every edge, the 56 px round strip 12 from the
   top and bottom (it keeps 4 px more of its own, for the current round's lift) */
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
.kd-countdown {
  background: radial-gradient(40% 70% at 50% 50%, rgb(255 95 31 / 0.2), rgb(12 13 16 / 0.72));
}
.kd-countdown-enter-active,
.kd-countdown-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-countdown-enter-from,
.kd-countdown-leave-to {
  opacity: 0;
}
/* lands fast and big, holds, gets out of the way of the next one */
.kd-count {
  color: var(--color-neutral-15);
  text-shadow: 0 0 40px rgb(255 95 31 / 0.7);
  animation: kd-count-beat 950ms var(--ease-out) both;
}
@keyframes kd-count-beat {
  0% {
    opacity: 0;
    transform: scale(1.7);
  }
  18% {
    opacity: 1;
    transform: scale(1);
  }
  80% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.9);
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
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
/* the battle is over: the frame goes plain grey and the arrows slip out, as on a case's drop screen */
.kd-arena.is-done {
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(var(--color-neutral-4), var(--color-neutral-4)) border-box;
}
.kd-arena.is-done .kd-amark {
  opacity: 0;
}
.kd-arena.is-done .kd-amark.left-0 {
  transform: translateX(-12px);
}
.kd-arena.is-done .kd-amark.right-0 {
  transform: translateX(12px);
}
/* the arrows sit on the frame's line, base flush with it (the rotated picture leaves a side gap of its own) */
.kd-amark.left-0 {
  translate: calc(-1 * var(--mark-in, 5px)) -50%;
}
.kd-amark.right-0 {
  translate: var(--mark-in, 5px) -50%;
}
.kd-arena-seat + .kd-arena-seat {
  border-left: 1px solid var(--color-neutral-4);
}
/* Team 2v2: the line between the teams is the strong one */
.kd-arena-seat.is-team-split {
  border-left: 2px solid rgb(255 95 31 / 0.5);
}
/* the seat ahead gets a warm floor while it leads */
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
.kd-result-face {
  box-shadow:
    0 0 0 3px var(--color-success),
    0 0 24px rgb(18 183 106 / 0.45);
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
