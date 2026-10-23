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

/** Who took the pot: "You" for the player, else the nickname */
const winnerName = computed(() => {
  const w = b.value.winnerSlot != null ? b.value.slots[b.value.winnerSlot]?.player : null
  return w ? (w.you ? t('pvp.you') : w.nickname) : ''
})
const pad2 = (n: number) => String(n).padStart(2, '0')

const short = (s?: string | null) => (s ? `${s.slice(0, 10)}…${s.slice(-10)}` : '—')
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-0 lg:pt-10">
    <UiPageBar
      :title="$t(`pvp.modes.${b.size}`)"
      :subtitle="`#${b.id}`"
      fixed-sides
      :left="[
        { label: $t('pvp.back'), icon: 'arrow-left', to: '/pvp' },
        { label: $t('case.share'), icon: 'share', onClick: shareBattle },
      ]"
      :right="[
        ...(data!.battle.status === 'finished' ? [{ label: $t('pvp.replay'), icon: 'refresh', onClick: replay }] : []),
        { label: $t('pvp.howItWorks'), icon: 'shield', to: '/fairness' },
      ]"
    />

    <!-- One line: what a seat costs · the cases, the current one marked · rounds and viewers -->
    <section class="grid grid-cols-2 items-center gap-x-4 gap-y-3 md:grid-cols-[auto_1fr_auto] md:gap-6">
      <div class="flex items-center gap-2">
        <span class="type-12-caps text-neutral-11">{{ $t('pvp.cost') }}</span>
        <UiPrice :amount="b.cost" size="m" />
      </div>
      <div class="scrollbar-none col-span-2 row-start-2 flex min-w-0 items-center gap-2 overflow-x-auto py-1 md:col-span-1 md:row-start-auto md:justify-center">
        <PvpCaseThumb
          v-for="(r, i) in b.rounds"
          :key="i"
          :image="r.image"
          :name="r.name"
          :size="isMobile ? 's' : 'm'"
          :state="b.status === 'waiting' ? 'default' : i < revealed ? 'done' : i === roundIdx && !done ? 'current' : 'default'"
        />
      </div>
      <div class="flex items-center justify-end gap-4">
        <span class="type-12 flex items-center gap-1.5 text-neutral-11 tabular-nums"><UiIcon name="eye" :size="16" />{{ b.viewers }}</span>
        <span class="type-12-caps text-neutral-11">
          {{ $t('pvp.rounds') }} <span class="text-neutral-15 tabular-nums">{{ Math.min(b.rounds.length, Math.max(0, revealed)) }}/{{ b.rounds.length }}</span>
        </span>
      </div>
    </section>

    <!-- The arena: every seat's reel side by side in one frame, the markers on its edges -->
    <section class="kd-arena relative overflow-hidden rounded-5xl">
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
        <div v-for="s in b.slots" :key="s.slot" class="kd-arena-seat relative min-w-0" :class="done && b.winnerSlot === s.slot && 'is-winner'">
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
          <span class="type-20-caps">{{ $t('pvp.wonBy', { name: winnerName }) }}</span>
          <UiPrice :amount="pot" size="l" tone="success" />
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
        :winner="done && b.winnerSlot === s.slot"
        :compact="isMobile"
        :can-join="!s.player && b.status === 'waiting' && !youIn"
        :can-call-bot="!s.player && b.status === 'waiting' && isCreator"
        @join="join(s.slot)"
        @bot="bot(s.slot)"
      />
    </section>

    <!-- Round slots: one per round per player, in order, filled as the rounds land -->
    <section class="grid gap-2 md:gap-4" :style="{ gridTemplateColumns: `repeat(${b.size}, minmax(0, 1fr))` }">
      <div v-for="s in b.slots" :key="s.slot" class="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(112px,1fr))] content-start gap-1.5">
        <template v-for="(_, ri) in b.rounds" :key="ri">
          <ItemTile v-if="ri < revealed && b.results?.[ri]" :item="b.results[ri]!.drops[s.slot]!" readonly class="kd-slot-in" />
          <div v-else class="kd-round-slot flex aspect-[112/132] flex-col items-center justify-center rounded-2xl">
            <span class="type-10-caps text-neutral-9">{{ $t('pvp.round') }}</span>
            <span class="type-20-caps text-neutral-8 tabular-nums">{{ pad2(ri + 1) }}</span>
          </div>
        </template>
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
</style>
