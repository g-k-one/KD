<script setup lang="ts">
import type { BattleResponse } from '#shared/types/api'

// Battle room (after csgogem): the mode as the title; cost · case strip · rounds and viewers in one line; one arena
// holding every seat's reel, the markers on its edges and, at the end, the result; the player bars under it; a fixed
// grid of round slots per player that fills as the rounds land (the page never jumps); the PF strip.
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
const pad2 = (n: number) => String(n).padStart(2, '0')

// --- Layout under review: three variants of the room (A case-like · B upgrade-like · C current, cleaner) ---------
type Layout = 'a' | 'b' | 'c'
const layout = computed<Layout>({
  get: () => (['a', 'b', 'c'].includes(String(route.query.v)) ? (route.query.v as Layout) : 'a'),
  set: (v) => router.replace({ query: { ...route.query, v } }),
})
const LAYOUTS = [
  { value: 'a' as const, label: 'A · Case' },
  { value: 'b' as const, label: 'B · Upgrade' },
  { value: 'c' as const, label: 'C · Clean' },
]
/** The one main move for the room right now: join / call a bot while waiting, nothing while live, Recreate at the end */
const mainAction = computed(() => {
  const free = b.value.slots.find((x) => !x.player)
  if (b.value.status === 'waiting') {
    if (free && !youIn.value) return { label: t('pvp.join'), price: b.value.cost, run: () => join(free.slot) }
    if (free && isCreator.value) return { label: t('pvp.callBot'), run: () => bot(free.slot), secondary: true }
    return { label: t('pvp.waitingForPlayers'), disabled: true, secondary: true }
  }
  if (!done.value) return { label: `${t('pvp.round')} ${Math.min(b.value.rounds.length, clock.value.round + 1)}/${b.value.rounds.length}`, disabled: true, secondary: true }
  return { label: t('pvp.recreate'), price: b.value.cost, run: recreate }
})
/** Every drop shown so far, newest first, with its seat */
const allDrops = computed(() =>
  (b.value.results ?? [])
    .slice(0, revealed.value)
    .flatMap((r, ri) => r.drops.map((d, si) => ({ d, si, ri })))
    .reverse(),
)
/** B: seats split to the two sides of the centre */
const sides = computed(() => {
  const n = b.value.slots.length
  const half = Math.ceil(n / 2)
  return [b.value.slots.slice(0, half), b.value.slots.slice(half)]
})
const ringLen = 2 * Math.PI * 92
const ringDone = computed(() => (b.value.rounds.length ? Math.min(1, revealed.value / b.value.rounds.length) : 0))
const avatarOf = (slot: number) => b.value.slots[slot]?.player?.avatar ?? ''

const short = (s?: string | null) => (s ? `${s.slice(0, 10)}…${s.slice(-10)}` : '—')
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-0 lg:pt-10">
    <UiPageBar
      :title="$t(`pvp.modeName.${b.mode}`)"
      :subtitle="`${$t(`pvp.modeRule.${b.mode}`)} · #${b.id}`"
      fixed-sides
      :left="[
        { label: $t('pvp.back'), icon: 'arrow-left', to: '/pvp' },
        { label: $t('case.share'), icon: 'share', onClick: shareBattle },
        ...(data!.battle.status === 'finished' ? [{ label: $t('pvp.replay'), icon: 'refresh', onClick: replay }] : []),
      ]"
    />


    <!-- Layout under review: A · B · C (also ?v=a|b|c) -->
    <div class="flex justify-center">
      <UiSegmented v-model="layout" :options="LAYOUTS" size="s" />
    </div>

    <!-- ================= A — like the case page ================= -->
    <template v-if="layout === 'a'">
      <!-- the params strip, the case page's Transparency language -->
      <section class="grid grid-cols-2 gap-x-6 gap-y-3 rounded-3xl bg-neutral-2 px-4 py-3 sm:grid-cols-4 lg:px-6">
        <div class="flex min-w-0 flex-col">
          <span class="type-12-caps text-neutral-11">{{ $t('pvp.mode') }}</span>
          <span class="type-16-caps truncate">{{ $t(`pvp.modeName.${b.mode}`) }}</span>
        </div>
        <div class="flex flex-col">
          <span class="type-12-caps text-neutral-11">{{ $t('pvp.cost') }}</span>
          <UiPrice :amount="b.cost" size="m" />
        </div>
        <div class="flex flex-col">
          <span class="type-12-caps text-neutral-11">{{ $t('pvp.rounds') }}</span>
          <span class="type-16-caps tabular-nums">{{ Math.min(b.rounds.length, revealed) }}/{{ b.rounds.length }}</span>
        </div>
        <div class="flex flex-col">
          <span class="type-12-caps text-neutral-11">{{ $t('pvp.value') }}</span>
          <UiPrice :key="pot" :amount="b.status === 'waiting' ? b.cost * b.size : pot" size="l" tone="coin" />
        </div>
      </section>
    <!-- The arena: every seat's reel side by side in one frame, the markers on its edges -->
    <section class="kd-arena relative overflow-hidden rounded-5xl">
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
        <div v-for="s in b.slots" :key="s.slot" class="kd-arena-seat relative min-w-0" :class="[done && winners.includes(s.slot) && 'is-winner', leaders.includes(s.slot) && 'is-lead', isTeam && s.slot === 2 && 'is-team-split']">
          <span :key="revealed" class="kd-seat-flash pointer-events-none absolute inset-0" aria-hidden="true" />
          <!-- the player in the head of their column -->
          <div class="kd-seat-head absolute inset-x-0 top-0 z-[4] flex items-center gap-2 p-2 md:p-3" :class="[leaders.includes(s.slot) && 'is-lead', done && winners.includes(s.slot) && 'is-winner']">
            <template v-if="s.player">
              <span class="block size-7 shrink-0 overflow-hidden rounded-full bg-neutral-7 md:size-8"><img :src="s.player.avatar" alt="" class="size-full object-cover" /></span>
              <span class="flex min-w-0 flex-col items-start">
                <span class="type-12 max-w-full truncate">{{ s.player.you ? $t('pvp.you') : s.player.nickname }}</span>
                <UiPrice :amount="totals[s.slot] ?? 0" size="xs" :tone="done && winners.includes(s.slot) ? 'success' : 'default'" />
              </span>
              <span v-if="leaders.includes(s.slot)" class="type-10-caps ml-auto rounded-sm bg-brand-base px-1.5 py-0.5 max-md:hidden">{{ $t('pvp.lead') }}</span>
              <span v-if="done && winners.includes(s.slot)" class="type-10-caps ml-auto rounded-sm bg-success px-1.5 py-0.5 text-neutral-1 max-md:hidden">{{ $t('pvp.winner') }}</span>
            </template>
            <span v-else class="type-12 text-neutral-11">{{ $t('pvp.free') }}</span>
          </div>
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


      <!-- the dock, as under the case reel: the cases · the one main move · Replay -->
      <section class="kd-pdock flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div class="scrollbar-none flex min-w-0 items-center gap-2 overflow-x-auto">
          <PvpCaseThumb
            v-for="(r, i) in b.rounds"
            :key="i"
            :image="r.image"
            :name="r.name"
            size="s"
            :state="b.status === 'waiting' ? 'default' : i < revealed ? 'done' : i === roundIdx && !done ? 'current' : 'default'"
          />
        </div>
        <UiButton size="l" class="w-full lg:w-80" :variant="mainAction.secondary ? 'secondary' : 'primary'" :disabled="mainAction.disabled" :loading="recreating" @click="mainAction.run?.()">
            <span>{{ mainAction.label }}</span>
            <span v-if="mainAction.price" class="btn-value"><UiPrice :amount="mainAction.price" size="m" tone="inverse" /></span>
          </UiButton>
        <div class="flex justify-end gap-2">
          <UiChip v-if="data!.battle.status === 'finished'" size="m" icon="refresh" @click="replay">{{ $t('pvp.replay') }}</UiChip>
          <UiChip size="m" icon="eye" class="pointer-events-none">{{ b.viewers }}</UiChip>
        </div>
      </section>
      <!-- the battle's drops, as "Found in this case" -->
      <section v-if="allDrops.length" class="flex flex-col gap-4">
        <UiSectionHeader :title="$t('pvp.drops')" />
        <TransitionGroup tag="div" name="kd-drop" class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          <div v-for="x in allDrops" :key="`${x.ri}-${x.si}`" class="relative">
            <ItemTile :item="x.d" readonly />
            <img :src="avatarOf(x.si)" alt="" class="absolute right-1.5 bottom-1.5 size-5 rounded-full ring-2 ring-neutral-2" />
          </div>
        </TransitionGroup>
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
    </template>

    <!-- ================= B — like the upgrade ================= -->
    <template v-else-if="layout === 'b'">
      <section class="grid items-start gap-4 lg:grid-cols-[1fr_340px_1fr] lg:gap-6">
        <!-- the centre: the rounds as a ring around the pot, the one main move under it -->
        <div class="flex flex-col items-center gap-4 lg:order-2">
          <div class="relative aspect-square w-full max-w-[280px]">
            <svg viewBox="0 0 200 200" class="absolute inset-0 size-full -rotate-90">
              <circle cx="100" cy="100" r="92" fill="none" stroke="var(--color-neutral-3)" stroke-width="8" />
              <circle cx="100" cy="100" r="92" fill="none" stroke="url(#kd-ring)" stroke-width="8" stroke-linecap="round" class="kd-ring" :stroke-dasharray="ringLen" :stroke-dashoffset="ringLen * (1 - ringDone)" />
              <defs>
                <linearGradient id="kd-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb13b" /><stop offset="1" stop-color="#ff5f1f" /></linearGradient>
              </defs>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
              <span class="type-12-caps text-neutral-11">{{ $t(`pvp.modeName.${b.mode}`) }}</span>
              <span v-if="countdown > 0" :key="countdown" class="kd-count-n type-48-caps text-success">{{ countdown }}</span>
              <template v-else>
                <UiPrice :key="pot" :amount="b.status === 'waiting' ? b.cost * b.size : pot" size="l" tone="coin" />
                <span class="type-12-caps text-neutral-11 tabular-nums">{{ $t('pvp.rounds') }} {{ Math.min(b.rounds.length, revealed) }}/{{ b.rounds.length }}</span>
              </template>
              <span v-if="done && b.winnerSlot != null" class="kd-result-title type-14-caps mt-1 px-6 text-success">{{ winnerName }}</span>
            </div>
          </div>
          <span class="type-12-regular text-center text-neutral-11">{{ $t(`pvp.modeRule.${b.mode}`) }}</span>
          <UiButton size="l" class="w-full max-w-80" :variant="mainAction.secondary ? 'secondary' : 'primary'" :disabled="mainAction.disabled" :loading="recreating" @click="mainAction.run?.()">
            <span>{{ mainAction.label }}</span>
            <span v-if="mainAction.price" class="btn-value"><UiPrice :amount="mainAction.price" size="m" tone="inverse" /></span>
          </UiButton>
          <UiChip v-if="data!.battle.status === 'finished'" size="m" icon="refresh" @click="replay">{{ $t('pvp.replay') }}</UiChip>
        </div>
        <!-- the two sides: every seat as a card with its own reel and its drops -->
        <div v-for="(side, si) in sides" :key="si" class="grid gap-3" :class="[si === 0 ? 'lg:order-1' : 'lg:order-3', side.length > 1 ? 'grid-cols-2' : 'grid-cols-1']">
          <div v-for="seat in side" :key="seat.slot" class="kd-bseat flex min-w-0 flex-col gap-2 rounded-5xl bg-neutral-2 p-2 md:p-3" :class="done && winners.includes(seat.slot) && 'is-winner'">
            <PvpPlayerSlot
              :player="seat.player"
              :total="totals[seat.slot]"
              :winner="done && winners.includes(seat.slot)"
              :lead="leaders.includes(seat.slot)"
              :compact="isMobile || side.length > 1"
              :can-join="!seat.player && b.status === 'waiting' && !youIn"
              :can-call-bot="!seat.player && b.status === 'waiting' && isCreator"
              @join="join(seat.slot)"
              @bot="bot(seat.slot)"
            />
            <PvpReel
              :case-ref="b.rounds[roundIdx] ?? null"
              :target="clock.round >= 0 || done ? (b.results?.[roundIdx]?.drops[seat.slot] ?? null) : null"
              :spin-key="done ? 'done' : `${clock.round}`"
              :spin-ms="b.roundMs - 1300"
              :instant="done"
              :compact="isMobile || side.length > 1"
              :waiting="b.status === 'waiting' || (clock.round < 0 && !done)"
            />
            <div class="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1.5">
              <ItemTile v-for="ri in Array.from({ length: revealed }, (_, k) => revealed - 1 - k)" :key="ri" :item="b.results![ri]!.drops[seat.slot]!" readonly class="kd-slot-in" />
            </div>
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
    </template>

    <!-- ================= C — the current room, cleaner ================= -->
    <template v-else>
      <section class="type-12-caps flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-neutral-11">
        <span>{{ $t(`pvp.modeName.${b.mode}`) }} · <span class="text-neutral-13">{{ $t(`pvp.modeRule.${b.mode}`) }}</span></span>
        <span>{{ $t('pvp.cost') }} <UiPrice :amount="b.cost" size="s" class="inline-flex align-middle" /></span>
        <span class="tabular-nums">{{ $t('pvp.rounds') }} {{ Math.min(b.rounds.length, revealed) }}/{{ b.rounds.length }}</span>
        <span>{{ $t('pvp.value') }} <UiPrice :key="pot" :amount="b.status === 'waiting' ? b.cost * b.size : pot" size="s" tone="coin" class="inline-flex align-middle" /></span>
        <span class="flex items-center gap-1 tabular-nums"><UiIcon name="eye" :size="14" />{{ b.viewers }}</span>
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

    <!-- Player bars: who sits where and what they have so far; join or call a bot on a free seat -->
    <section class="grid gap-2 md:gap-4" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
      <PvpPlayerSlot
        v-for="s in b.slots"
        :key="s.slot"
        :player="s.player"
        :total="totals[s.slot]"
        :winner="done && winners.includes(s.slot)"
        :lead="leaders.includes(s.slot)"
        :compact="isMobile"
        :can-join="!s.player && b.status === 'waiting' && !youIn"
        :can-call-bot="!s.player && b.status === 'waiting' && isCreator"
        @join="join(s.slot)"
        @bot="bot(s.slot)"
      />
    </section>

      <!-- each player's drops right under their bar, newest first -->
      <section class="grid gap-2 md:gap-4" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
        <TransitionGroup v-for="seat in b.slots" :key="seat.slot" tag="div" name="kd-drop" class="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(112px,1fr))] content-start gap-1.5">
          <ItemTile v-for="ri in Array.from({ length: revealed }, (_, k) => revealed - 1 - k)" :key="ri" :item="b.results![ri]!.drops[seat.slot]!" readonly />
        </TransitionGroup>
      </section>
    </template>
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
.kd-round-slot {
  background: var(--color-neutral-2);
  box-shadow: inset 0 0 0 1px var(--color-neutral-3);
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
.kd-pdock {
  border-radius: 24px;
  background: var(--color-neutral-2);
  padding: 12px;
}
@media (min-width: 64rem) {
  .kd-pdock {
    padding-inline: 16px;
  }
}
/* A: the players' heads inside the arena, over the reel's top fade */
.kd-seat-head {
  background: linear-gradient(180deg, rgb(12 13 16 / 0.92), rgb(12 13 16 / 0));
}
.kd-seat-head.is-lead {
  box-shadow: inset 0 2px 0 var(--color-brand-base);
}
.kd-seat-head.is-winner {
  box-shadow: inset 0 2px 0 var(--color-success);
}
/* B */
.kd-ring {
  transition: stroke-dashoffset 600ms var(--ease-out);
  filter: drop-shadow(0 0 8px rgb(255 95 31 / 0.5));
}
.kd-bseat {
  transition: box-shadow var(--dur-slow) var(--ease-out);
}
.kd-bseat.is-winner {
  box-shadow:
    inset 0 0 0 1px rgb(18 183 106 / 0.35),
    0 0 40px -12px rgb(18 183 106 / 0.6);
}
.kd-count-n {
  animation: kd-vs 600ms var(--ease-spring);
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
</style>
