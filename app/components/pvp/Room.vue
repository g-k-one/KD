<script setup lang="ts">
import type { BattleResponse, BattleShare, BattleSlot, CaseItem, CaseResponse } from '#shared/types/api'
import { BATTLE_LEAD_MS } from '#shared/utils/battle'

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
const ex = useExtrude()

const { data, refresh, error } = await useFetch<BattleResponse>(() => `/api/battles/${id.value}`, { key: `battle-${id.value}` })
if (error.value) {
  const notFound = createError({ statusCode: 404, statusMessage: 'Battle not found', fatal: true })
  if (import.meta.server) throw notFound
  // on a tap the room sits in the page's Suspense: show the 404 and never resolve, so the room is never drawn empty
  showError(notFound)
  await new Promise(() => {})
}
// Replay (#7): a finished battle plays again from the countdown — on a tap, or for anyone opening a shared
// ?replay=1 link (only once it is over: a link to a battle still running just watches it). The room just runs its own
// clock from now, so the button works the moment the room's last round ends, before the next poll says finished.
const replayAt = ref<number | null>(route.query.replay && data.value!.battle.status === 'finished' ? Date.now() : null)
const b = computed(() => {
  const x = data.value!.battle
  return replayAt.value ? { ...x, status: 'live' as const, startedAt: new Date(replayAt.value + BATTLE_LEAD_MS).toISOString() } : x
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
// the stage comes up unseen first, so the replay's countdown has its 3D label from the first second too
async function replay() {
  celebrated.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
  countArmed.value = true
  await nextTick()
  await prepareCount()
  replayAt.value = Date.now()
  countArmed.value = false
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
// how long a landed drop holds before the next round: the full rarity reveal, as in a case, and it lands on the seat's list
const ROUND_HOLD_MS = 1500
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
  return clock.value.round + (clock.value.inRound > b.value.roundMs - ROUND_HOLD_MS ? 1 : 0)
})
const totals = computed(() => slotTotals(b.value, revealed.value))
const pot = computed(() => totals.value.reduce((a, x) => a + x, 0))
// Who plays together: 2 vs 2 is two teams of two, every other mode each seat for itself
const seatGroups = computed(() => (isTeam.value ? [b.value.slots.slice(0, 2), b.value.slots.slice(2, 4)] : b.value.slots.map((s) => [s])))
// what a seat has dropped so far, in round order
const seatDrops = (slot: number) => (b.value.results ?? []).slice(0, Math.max(0, revealed.value)).flatMap((r) => r.drops[slot] ?? [])
const groupTotal = (g: BattleSlot[]) => g.reduce((a, s) => a + (totals.value[s.slot] ?? 0), 0)
// the two sides of CS2, each in its colour
const TEAM_SIDE = ['ct', 't'] as const
const teamState = (g: BattleSlot[]) => (done.value ? (winners.value.includes(g[0]!.slot) ? 'won' : 'lost') : leaders.value.includes(g[0]!.slot) ? 'lead' : '')
// the battle's dearest skin, for the finished battle's stats
const bestDrop = computed(() => Math.max(0, ...(b.value.results ?? []).flatMap((r) => r.drops.map((d) => d?.price ?? 0))))
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

// What one winner takes: all of it alone, an exact half in a team, the rest of a skin that would not divide paid in coins
const shareValue = (s: BattleShare) => s.items.reduce((a, i) => a + i.price, 0) + s.coins
const winAmount = computed(() => (b.value.shares.length > 1 ? shareValue(b.value.shares[0]!) : pot.value))
const myShare = computed(() => b.value.shares.find((s) => b.value.slots[s.slot]?.player?.you))
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
    toast.show(t('pvp.youWon', { amount: formatCoins(winAmount.value) }), 'success', 5000)
    session.fetchMe()
  } else {
    sfx.lose()
    const w = b.value.slots[b.value.winnerSlot ?? 0]?.player
    toast.show(t('pvp.youLost', { name: w?.nickname ?? '' }), 'danger', 5000)
  }
})

// the seconds before the first round (the page's clock ticks late, so a fresh start would read 4: never above 3)
const countdown = computed(() => (b.value.status !== 'waiting' && b.value.startedAt && clock.value.round < 0 ? Math.min(3, Math.max(0, Math.ceil((Date.parse(b.value.startedAt) - now.value) / 1000))) : 0))
// The numbers are pseudo-3D (Extrude): the 3 spins in, each next flips out of the one before it while the whole label swings
// to the other side, a full second each on real timers, not the page's 200 ms clock. The VS comes the same way, out of the 1.
// Then it sinks onto the arena's own badge, smoke rolls out from under it as it lands, and only then the reels start. The
// label is mounted ahead, while the seats fill, so the first number does not pay for the shader. No WebGL: the plain number
const COUNT_LOOK = {
  font: '800 {s}px Rubik, ui-sans-serif, system-ui, sans-serif',
  charset: '0123456789VS',
  face: ['#fff6e0', '#ffc46b', '#ff7a1a'],
  side: ['#d9480f', '#2a0e00'],
  metal: 0.2,
  gloss: 0.55,
  bevel: 2,
  depth: 17,
  yaw: -22,
  pitch: 12,
  persp: 700,
  drag: false,
}
const howOpen = ref(false)
const countEl = useTemplateRef<HTMLElement>('countEl')
const fxHost = useTemplateRef<HTMLElement>('fxHost')
const fx = useForge(fxHost)
let countLabel: ExtrudeHandle | null = null
let countReady: Promise<void> | null = null
let countFresh = true
let countSide = 1
let countTimers: ReturnType<typeof setTimeout>[] = []
const count3d = ref(false)
const countArmed = ref(false)
// what stands in the arena now: 3, 2, 1, then 0, the VS (countFade); the arena's badge steps aside until the VS is nearly on it
const countShown = ref(0)
const countFade = ref(false)
const countSink = ref(false)
const countHome = ref(false)
function dropCountLabel() {
  countLabel?.destroy()
  countLabel = null
  countReady = null
  countFresh = true
  count3d.value = false
  countShown.value = 0
  countFade.value = false
  countSink.value = false
  countHome.value = false
}
function prepareCount() {
  countReady ??= (async () => {
    if (!countEl.value) return
    countLabel = await ex.mount(countEl.value, { ...COUNT_LOOK, size: isMobile.value ? 88 : 124, quality: isMobile.value ? 'low' : 'auto', text: '3' })
    await countLabel?.ready
    count3d.value = !!countLabel
  })()
  return countReady
}
// The shader and Forge's canvas block the page while they build: never in the frames a room opens (Recreate stuttered), but
// once the browser is idle. A countdown that starts sooner asks for the label itself.
const whenIdle = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 500))
// the stage went (a countdown that was already running when the page opened): the label went with it
watch(countEl, (el) => (el ? whenIdle(prepareCount) : dropCountLabel()))
async function countBeat(n: number) {
  countShown.value = n
  if (!n) countFade.value = true
  sfx.count(n <= 1)
  await prepareCount()
  if (!countLabel) return
  const text = n ? String(n) : 'VS'
  countSide = -countSide
  countLabel.set({ yaw: 22 * countSide })
  if (countFresh) {
    countFresh = false
    if (countLabel.text !== text) countLabel.set({ text })
    countLabel.play('pop')
  } else {
    countLabel.swap(text, { style: 'flip' })
    countLabel.rotate(240 * countSide, 0, true)
  }
}
function countLanded() {
  const host = fxHost.value
  dropCountLabel()
  if (host) fx.play('kdPuff', { x: host.offsetWidth / 2, y: host.offsetHeight / 2, size: host.offsetHeight * 1.9 })
}
// in ms before the first reel: a second for each number, then the VS, and the smoke has its time before the reels move
function runCount() {
  const left = Date.parse(b.value.startedAt!) - Date.now()
  const at = (ms: number, f: () => void) => left > ms - 900 && countTimers.push(setTimeout(f, Math.max(0, left - ms)))
  countTimers.forEach(clearTimeout)
  countTimers = []
  countHome.value = true
  prepareCount()
  at(4000, () => countBeat(3))
  at(3000, () => countBeat(2))
  at(2000, () => countBeat(1))
  at(1000, () => countBeat(0))
  at(620, () => (countSink.value = true))
  at(270, () => (countHome.value = false))
  at(200, countLanded)
}
watch(countdown, (n, old) => n > 0 && !old && nextTick(runCount))
onMounted(() => {
  if (!done.value) whenIdle(() => fx.preload('kd'))
  if (countdown.value > 0) nextTick(runCount)
})
onBeforeUnmount(() => {
  countTimers.forEach(clearTimeout)
  dropCountLabel()
})

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

// Before the start anyone can get their stake back: a player leaves their seat, the creator cancels the whole battle (every
// stake comes back) or clears a seat. From the start on nothing can be undone: the result is already fixed by the seeds.
const leaveOpen = ref(false)
const leaving = ref(false)
async function leave() {
  leaving.value = true
  try {
    const res = await $fetch<BattleResponse & { cancelled?: boolean }>(`/api/battles/${id.value}/leave`, { method: 'POST' })
    if (session.user && res.balance != null) session.user.balance = res.balance
    leaveOpen.value = false
    toast.show(t(res.cancelled ? 'pvp.cancelled' : 'pvp.left', { amount: formatCoins(b.value.cost) }), 'success', 4000)
    if (res.cancelled) return navigateTo('/pvp')
    data.value = res
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    leaving.value = false
  }
}
async function kick(slot: number) {
  try {
    data.value = await $fetch<BattleResponse>(`/api/battles/${id.value}/kick`, { method: 'POST', body: { slot } })
    sfx.deselect()
  } catch (e) {
    toast.error(e, t('common.error'))
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
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-0 lg:pt-10">
    <!-- the bar's shield is the general fairness page, as on every page; this battle's own check is Check PvP in the result -->
    <UiPageBar
      class="lg:-mb-2"
      fixed-sides
      :left="[
        { label: $t('pvp.back'), icon: 'arrow-left', to: '/pvp' },
        { label: $t('case.share'), icon: 'share', onClick: shareBattle },
      ]"
      :right="[
        { label: $t('upgrade.howItWorks'), icon: 'info', onClick: () => (howOpen = true) },
        { label: $t('case.fairness'), icon: 'shield', to: '/fairness' },
      ]"
    >
      <!-- the mode and the battle's number, one big line in the mode's colour, as in the lobby -->
      <h1 class="kd-room-title type-16-caps md:type-20-caps flex items-center gap-2 whitespace-nowrap tabular-nums md:gap-3" :class="`is-${b.mode}`">
        <span>{{ $t(`pvp.modeName.${b.mode}`) }}</span>
        <span>#{{ b.id }}</span>
      </h1>
    </UiPageBar>
    <PvpHowModal v-model="howOpen" />

    <!-- Meta line: who is watching and the round · the battle's cases (the current one lit, spent ones dim) · what a
         seat costs and what is in the pot (the money on the right, as in the lobby's plate). Once the battle is over it
         stays as the battle's stats: the pot is in the arena's result by then, so the best drop takes its place.
         Phones: the money and the cases only, the strip already shows the round -->
    <section class="kd-dock flex flex-wrap items-center justify-between gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-3">
      <div class="type-12-caps flex gap-2 tabular-nums max-lg:hidden">
        <span class="kd-dock-stat"><UiIcon name="eye" :size="16" /><span class="text-neutral-15">{{ b.viewers }}</span></span>
        <span class="kd-dock-stat">{{ $t('pvp.rounds') }} <span class="text-neutral-15" data-allow-mismatch="text">{{ Math.min(b.rounds.length, revealed) }}/{{ b.rounds.length }}</span></span>
      </div>
      <!-- As many rounds as fit, none cut: a window that follows the current round, a "+N" tile for the ones after it,
           and a soft fade on the side where earlier rounds went out of view -->
      <div ref="stripEl" class="kd-rounds flex min-w-0 items-center gap-2 overflow-hidden px-1 py-2 max-lg:order-last max-lg:-mx-1 max-lg:-my-2 max-lg:w-[calc(100%+8px)] lg:-my-1 lg:max-w-full lg:py-1" :class="[strip.from > 0 && 'is-cut', strip.more > 0 && 'is-more']">
        <PvpCaseThumb v-for="i in strip.idx" :key="i" :image="b.rounds[i]!.image" :name="`${b.rounds[i]!.name} · ${formatCoins(b.rounds[i]!.price)}`" size="m" :state="roundState(i)" />
      </div>
      <div class="type-12-caps flex justify-end gap-2 max-lg:w-full">
        <span class="kd-dock-stat max-lg:flex-1">{{ $t('pvp.cost') }} <UiPrice :amount="b.cost" size="m" :compact="isMobile" /></span>
        <span v-if="done" class="kd-dock-stat max-lg:flex-1">{{ $t('pvp.bestDrop') }} <UiPrice :amount="bestDrop" size="m" tone="coin" :compact="isMobile" class="tabular-nums" /></span>
        <span v-else class="kd-dock-stat max-lg:flex-1">{{ $t('pvp.pot') }} <UiPrice :key="pot" :amount="b.status === 'waiting' ? b.cost * b.size : pot" size="m" tone="coin" :compact="isMobile" class="kd-pot tabular-nums" /></span>
      </div>
    </section>
    <!-- The arena: every seat's reel side by side in one frame, the markers on its edges -->
    <section class="kd-arena relative overflow-hidden rounded-5xl" :class="done && 'is-done'">
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
        <div v-for="s in b.slots" :key="s.slot" class="kd-arena-seat relative min-w-0" :class="[done && winners.includes(s.slot) && 'is-winner', leaders.includes(s.slot) && 'is-lead', isTeam && s.slot === 2 && 'is-team-split']">
          <!-- a free seat while it waits: an empty lane, no second Join: the action is on the seat's plate under it -->
          <div v-if="!s.player && b.status === 'waiting'" class="grid place-items-center px-2 text-center text-neutral-11" :class="isMobile ? 'h-50' : 'h-72'">
            <!-- a phone's narrow lanes have no room for it beside the VS -->
            <span v-if="!isMobile || b.size === 2" class="kd-free-seat max-w-24 text-balance" :class="isMobile ? 'type-10-caps' : 'type-12-caps'">{{ $t('pvp.waitingForPlayer') }}</span>
          </div>
          <PvpReel
            v-else
            bare
            :case-ref="b.rounds[roundIdx] ?? null"
            :target="clock.round >= 0 || done ? (b.results?.[roundIdx]?.drops[s.slot] ?? null) : null"
            :spin-key="done ? 'done' : `${clock.round}`"
            :spin-ms="b.roundMs - ROUND_HOLD_MS - 300"
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
          <span v-if="!countHome && s.slot > 0 && (!isTeam || s.slot === 2)" :key="Math.max(0, clock.round)" class="kd-vs type-12-caps absolute top-1/2 left-0 grid size-9 place-items-center rounded-full" :class="[isTeam && 'is-team', clock.round < 1 && 'is-landing']">{{ $t('pvp.vs') }}</span>
        </span>
      </div>
      <img src="/img/fx/marker-top.svg" alt="" class="kd-amark absolute top-1/2 left-0 -rotate-90" />
      <img src="/img/fx/marker-top.svg" alt="" class="kd-amark absolute top-1/2 right-0 rotate-90" />

      <div ref="fxHost" class="pointer-events-none absolute inset-0 z-[11]" />
      <!-- The arena dims and the number stands in its middle. The stage stays in the page while seats fill, unseen, so its 3D
           label is ready before the first second -->
      <div v-if="b.status === 'waiting' || countArmed || countdown > 0 || countFade" class="kd-countdown pointer-events-none absolute inset-0 grid place-items-center" :class="[countdown > 0 && countHome && 'is-on', countFade && 'is-fade', countSink && 'is-sink']">
        <div class="kd-count-stage relative grid size-40 place-items-center lg:size-52">
          <div ref="countEl" class="absolute inset-0" />
          <span v-if="!count3d && countShown" :key="countShown" class="kd-count-plain text-[56px] leading-none font-extrabold tabular-nums lg:text-[80px]">{{ countShown }}</span>
        </div>
      </div>

      <!-- The result, inside the arena: who took the pot, how much, and the same battle again -->
      <Transition name="kd-result">
        <div v-if="done && b.winnerSlot != null" class="kd-arena-result absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-4 text-center lg:flex-row lg:gap-8">
          <!-- two blocks of one height, a hairline between them on desktop: who took it (the face as tall as caption · name ·
               pot) and what to do next; phones: the actions under it -->
          <div class="kd-result-title flex max-w-full min-w-0 items-center gap-3 text-left lg:gap-4">
            <span class="flex shrink-0 -space-x-3">
              <span v-for="w in winners" :key="w" class="kd-result-face relative block overflow-hidden rounded-full bg-neutral-7" :class="isMobile ? (winners.length > 1 ? 'size-12' : 'size-16') : 'size-20'">
                <img :src="b.slots[w]?.player?.avatar" alt="" class="size-full object-cover" :class="b.slots[w]?.player?.bot && 'scale-75 object-contain'" />
              </span>
            </span>
            <span class="flex min-w-0 flex-col items-start">
              <span class="type-12-caps text-success">{{ winners.length > 1 ? $t('pvp.battleWonTeam') : $t('pvp.battleWon') }}</span>
              <!-- always one line: a team's two names step down a size on phones, and the longest are cut, not wrapped -->
              <span class="max-w-full truncate leading-7 font-extrabold uppercase lg:type-28" :class="winners.length > 1 ? 'text-base' : 'text-[22px]'">{{ winners.map(nameOf).join(' & ') }}</span>
              <span class="mt-1 flex items-center gap-2">
                <UiPrice :amount="winAmount" :size="isMobile ? 'l' : 'xl'" tone="coin" />
                <span v-if="winners.length > 1" class="type-12-caps text-neutral-12">{{ $t('pvp.each') }}</span>
              </span>
              <span v-if="myShare && winners.length > 1" class="type-12-regular mt-0.5 text-neutral-12">{{ myShare.coins ? $t('pvp.yourHalfCoins', { n: myShare.items.length, coins: formatCoins(myShare.coins) }, myShare.items.length) : $t('pvp.yourHalf', { n: myShare.items.length }, myShare.items.length) }}</span>
            </span>
          </div>
          <span class="hidden h-22 w-px shrink-0 bg-neutral-5 lg:block" aria-hidden="true" />
          <!-- Recreate across, Check and Replay under it; phones: one row, those two as icons, so it fits the arena -->
          <div class="kd-result-pot flex justify-center gap-2 lg:grid lg:w-80 lg:grid-cols-2">
            <UiButton size="m" icon="refresh" class="lg:col-span-2" :loading="recreating" @click="recreate">
              {{ $t('pvp.recreate') }}
              <span class="btn-value"><UiPrice :amount="b.cost" size="s" tone="inverse" /></span>
            </UiButton>
            <UiButton variant="fair" size="m" icon="shield-check" :icon-only="isMobile" :aria-label="$t('pvp.checkBattle')" @click="verifyOpen = true">
              <template v-if="!isMobile">{{ $t('pvp.checkBattle') }}</template>
            </UiButton>
            <UiButton variant="secondary" size="m" icon="demo" :icon-only="isMobile" :aria-label="$t('pvp.replay')" @click="replay">
              <template v-if="!isMobile">{{ $t('pvp.replay') }}</template>
            </UiButton>
          </div>
        </div>
      </Transition>
    </section>


    <!-- Player bars: who sits where and what they have so far; join or call a bot on a free seat. Desktop: 24 px around the
         columns, down from the arena as between them; phones: one 12 px step down through the plates and tiles -->
    <section class="kd-lanes max-lg:-mt-1" :class="isTeam && 'is-team'" :style="{ gridTemplateColumns: `repeat(${isTeam ? 2 : b.size}, minmax(0, 1fr))` }">
      <!-- one column per seat, one per team in 2 vs 2. Desktop: a 24 px panel, 12 px in, so the plates and the tiles inside
           take 12 px corners (24 = 12 + 12); under each bar, its drops, newest first -->
      <div v-for="(g, gi) in seatGroups" :key="gi" class="kd-seat flex min-w-0 flex-col gap-3 lg:rounded-5xl lg:bg-neutral-2 lg:p-3" :class="[done && winners.includes(g[0]!.slot) && 'is-won', isTeam && 'max-md:gap-1']">
      <!-- the team as one: its name, what it holds together, its chance; green while ahead, the result at the end -->
      <div v-if="isTeam" class="kd-team-head relative flex h-12 items-center gap-2 rounded-2xl pr-3 pl-2 lg:h-16 lg:gap-3 lg:pl-[9px]" :class="teamState(g) && `is-${teamState(g)}`">
        <!-- the team's emblem where a seat has its avatar, the winners' crown on its corner as on a seat -->
        <span class="relative shrink-0">
          <img :src="`/img/teams/${TEAM_SIDE[gi]}.svg`" alt="" class="block size-8 rounded-full lg:size-11" draggable="false" />
          <span v-if="teamState(g) === 'won'" class="kd-team-crown absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full text-success"><UiIcon name="crown-fill" :size="14" /></span>
        </span>
        <span class="kd-team-who flex min-w-0 flex-1 flex-col gap-0.5" :class="revealed === 0 && 'is-idle'">
          <span class="kd-team-name truncate" :class="[isMobile ? 'type-12-caps' : 'type-16-caps', `is-${TEAM_SIDE[gi]}`]">{{ $t(`pvp.team.${TEAM_SIDE[gi]}${isMobile ? 'Short' : ''}`) }}</span>
          <UiPrice :amount="groupTotal(g)" :size="isMobile ? 's' : 'm'" :tone="teamState(g) === 'lost' ? 'muted' : teamState(g) === 'won' ? 'default' : 'coin'" class="kd-fade tabular-nums" :class="revealed > 0 && 'is-on'" />
        </span>
        <span v-if="b.status !== 'waiting'" class="flex shrink-0 flex-col items-end gap-1">
          <span :class="[isMobile ? 'type-14-caps' : 'type-20-caps', done ? (teamState(g) === 'won' ? 'text-success' : 'text-neutral-11') : teamState(g) === 'lead' ? 'text-success' : 'text-neutral-15', !done && 'tabular-nums']">{{ done ? $t(teamState(g) === 'won' ? 'pvp.won' : 'pvp.lost') : `${Math.round(chances[g[0]!.slot] ?? 0)}%` }}</span>
          <span v-if="!isMobile" class="type-10-caps" :class="teamState(g) === 'won' ? 'text-success' : 'text-neutral-11'">{{ done ? $t('pvp.result') : $t('pvp.toWin') }}</span>
        </span>
      </div>
      <div :class="isTeam && 'kd-team-seats grid'">
      <div v-for="s in g" :key="s.slot" class="flex min-w-0 flex-col">
      <PvpPlayerSlot
        :quiet="isTeam"
        :player="s.player"
        :total="totals[s.slot]"
        :winner="done && winners.includes(s.slot)"
        :lead="leaders.includes(s.slot)"
        :chance="s.player && !done && b.status !== 'waiting' ? chances[s.slot] : undefined"
        :result="s.player && done ? (winners.includes(s.slot) ? 'won' : 'lost') : undefined"
        :compact="isMobile"
        :can-join="!s.player && b.status === 'waiting' && !youIn"
        :can-call-bot="!s.player && b.status === 'waiting' && isCreator"
        :can-kick="!!s.player && !s.player.you && s.slot > 0 && b.status === 'waiting' && isCreator"
        :can-leave="!!s.player?.you && b.status === 'waiting'"
        @kick="kick(s.slot)"
        @leave="leaveOpen = true"
        :busy="busySlot === s.slot"
        @join="join(s.slot)"
        @bot="bot(s.slot)"
      />
      <!-- the seat's drops, each as it lands; once it is over, the losers' step back -->
      <PvpSeatDrops :items="seatDrops(s.slot)" :lost="done && !winners.includes(s.slot)" :tight="isTeam" />
      </div>
      </div>
      </div>
    </section>
    <!-- the kit's confirm: what happens in the description, the money in the sale's row, red for the step you can't take back -->
    <UiModal v-model="leaveOpen" :title="$t(isCreator ? 'pvp.cancelTitle' : 'pvp.leaveTitle')" :description="$t(isCreator ? 'pvp.cancelText' : 'pvp.leaveText')">
      <div class="flex items-center justify-between rounded-2xl bg-neutral-3 px-4 py-3">
        <span class="type-12-caps text-neutral-11">{{ $t('pvp.stakeBack') }}</span>
        <UiPrice :amount="b.cost" size="xl" tone="success" />
      </div>
      <template #actions>
        <UiButton variant="secondary" size="l" class="flex-1" @click="leaveOpen = false">{{ $t('pvp.stay') }}</UiButton>
        <UiButton variant="danger" size="l" class="flex-1" :loading="leaving" @click="leave">{{ $t(isCreator ? 'pvp.cancelBattle' : 'pvp.leaveBattle') }}</UiButton>
      </template>
    </UiModal>
    <PvpVerifyModal v-model="verifyOpen" :battle="b" />
  </div>
</template>

<style scoped>
.kd-room-title {
  color: var(--color-coin);
}
/* the smallest phones: the line between the bar's four icons */
@media (max-width: 359.98px) {
  .kd-room-title {
    gap: 4px;
    font-size: 12px;
  }
}
.kd-room-title.is-crazy {
  color: var(--color-item-classified);
}
.kd-room-title.is-team {
  color: var(--color-item-milspec);
}
/* a column to each lane; the gap between two seats is split evenly around the arena's line */
.kd-lanes {
  --lane-gap: 8px;
  display: grid;
  column-gap: var(--lane-gap);
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
/* phones, 2 vs 2: the teams read as groups: 4 px inside one, 12 between them */
@media (max-width: 47.999rem) {
  .kd-lanes.is-team {
    --lane-gap: 12px;
  }
}
.kd-lanes > * {
  min-width: 0;
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
.kd-team-crown {
  background: var(--color-neutral-1);
  box-shadow: 0 0 0 1px rgb(18 183 106 / 0.4);
}
.kd-team-name.is-ct {
  color: #8db4f5;
}
.kd-team-name.is-t {
  color: #eeb04f;
}
/* a team's head reads like a seat's plate; green while the team is ahead */
.kd-team-head {
  isolation: isolate;
  background: var(--color-neutral-3);
  transition: background-color var(--dur-slow) var(--ease-out);
}
/* a layer that fades: a gradient itself cannot */
.kd-team-head::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(18 183 106 / 0.26), rgb(18 183 106 / 0.05) 70%);
  opacity: 0;
  transition: opacity var(--dur-slow) var(--ease-out);
}
.kd-team-head.is-lead::before {
  opacity: 1;
}
.kd-team-head.is-won {
  background: var(--color-success-24);
}
/* no coins yet: the name in the plate's middle, up as the sum fades in */
.kd-team-who {
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-team-who.is-idle {
  transform: translateY(9px);
}
@media (min-width: 64rem) {
  .kd-team-who.is-idle {
    transform: translateY(11px);
  }
}
/* a team's two seats: equal, as all the seats */
.kd-team-seats {
  gap: 4px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
@media (min-width: 48rem) {
  .kd-team-seats {
    gap: 8px;
  }
}
@media (min-width: 64rem) {
  .kd-team-seats {
    gap: 12px;
  }
}
/* the winner's column: green from the crown's corner, down into the plain panel */
@media (min-width: 64rem) {
  .kd-seat {
    position: relative;
    isolation: isolate;
  }
  .kd-seat::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: linear-gradient(155deg, rgb(18 183 106 / 0.24), transparent 55%);
    opacity: 0;
    transition: opacity 600ms var(--ease-out);
  }
  .kd-seat.is-won::before {
    opacity: 1;
  }
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
.kd-countdown::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgb(12 13 16 / 0.6);
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-countdown.is-on::before {
  opacity: 1;
}
.kd-count-stage {
  z-index: 12;
  opacity: 0;
  transition: opacity 260ms var(--ease-out);
}
.kd-countdown.is-on .kd-count-stage,
.kd-countdown.is-fade .kd-count-stage {
  opacity: 1;
}
/* the VS sinks exactly onto the badge, gone as the badge comes up under it */
.kd-countdown.is-sink .kd-count-stage {
  --home: 0.16;
  animation: kd-count-vs 420ms cubic-bezier(0.65, 0, 0.35, 1) both;
}
@media (min-width: 64rem) {
  .kd-countdown.is-sink .kd-count-stage {
    --home: 0.13;
  }
}
@keyframes kd-count-vs {
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(var(--home));
  }
}
.kd-countdown.is-fade::before {
  transition-duration: 700ms;
}
.kd-count-plain {
  color: var(--color-neutral-15);
  animation: kd-count-beat 950ms var(--ease-out) both;
}
@keyframes kd-count-beat {
  0% {
    opacity: 0;
    transform: scale(1.5);
  }
  18%,
  80% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.9);
  }
}
/* phones: two equal chips, the label on the left edge, the money on the right */
@media (max-width: 63.98rem) {
  .kd-dock-stat {
    height: 40px;
    min-width: 0;
    justify-content: space-between;
    padding: 0 12px;
  }
}
.kd-arena {
  border: 4px solid transparent;
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(180deg, var(--color-neutral-4) 15%, rgb(255 95 31 / 0.85) 50%, var(--color-neutral-4) 85%) border-box;
}
/* the case reel's marker, turned: 28 × 22, its base on the frame's outer edge */
.kd-amark {
  width: 28px;
  height: 22px;
  max-width: none;
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
/* the turned picture keeps its 28 px box: 3 px of it stick out past the turned 22, 4 more reach the frame's outer edge */
.kd-amark.left-0 {
  translate: -7px -50%;
}
.kd-amark.right-0 {
  translate: 7px -50%;
}
/* phones: the narrow lanes take the marker of the case page's phone grid */
@media (max-width: 47.999rem) {
  .kd-amark {
    width: 16px;
    height: 12px;
  }
  .kd-amark.left-0 {
    translate: -6px -50%;
  }
  .kd-amark.right-0 {
    translate: 6px -50%;
  }
}
.kd-arena-seat + .kd-arena-seat {
  border-left: 1px solid var(--color-neutral-4);
}
/* Team 2v2: the line between the teams is the strong one */
.kd-arena-seat.is-team-split {
  border-left: 2px solid rgb(255 95 31 / 0.5);
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
/* the first one is the countdown's VS arriving: no beat, it only comes up under the label */
.kd-vs.is-landing {
  animation: kd-vs-land 240ms var(--ease-out) both;
}
@keyframes kd-vs-land {
  from {
    opacity: 0;
    scale: 0.82;
  }
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
  background: rgb(12 13 16 / 0.88);
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
/* what appears in a line that already holds its place */
.kd-fade {
  opacity: 0;
  transition: opacity var(--dur-slow) var(--ease-out);
}
.kd-fade.is-on {
  opacity: 1;
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
