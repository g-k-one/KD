<script setup lang="ts">
import type { Battle } from '#shared/types/api'

// A battle as a card (GK's sketch): the top lit in the mode's colour out of the top left corner — its chip and name (the
// rule in a tooltip) on the left, what is at stake on the right (the pot; the round while live; Ended once over). The
// battle's cases, each once (×N when it opens more than once): up to three sit in one row with the players under them;
// more fill a second row that fades into the card under the players. The players: a stack per side, VS between the
// teams, + on a free seat; while live the leader wears the mode's ring and a crown, once over the winners a green one.
// The button says what to do: Join with the seat's price (a guest signs in first), Watch, or View.
// Compact: the same card for a phone's two columns.
const props = defineProps<{ battle: Battle; compact?: boolean }>()
const now = useClock(1000)
const { onPointerMove } = useSpotlight()
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()

// every case once, in the order it first opens, with how many rounds open it
const cases = computed(() => {
  const by = new Map<string, { slug: string; name: string; image: string; qty: number }>()
  for (const r of props.battle.rounds) {
    const c = by.get(r.slug)
    if (c) c.qty += 1
    else by.set(r.slug, { slug: r.slug, name: r.name, image: r.image, qty: 1 })
  }
  return [...by.values()]
})
// up to three cases share one tall row, as wide as they need (no empty tiles, bigger pictures); past three, two rows of
// three that fade under the players (the room lists every case)
const twoRows = computed(() => cases.value.length > 3)
const tiles = computed(() => cases.value.slice(0, 6))
const blanks = computed(() => (twoRows.value ? 6 - tiles.value.length : 0))
const cols = computed(() => (twoRows.value ? 3 : tiles.value.length))

const pot = computed(() => props.battle.cost * props.battle.size)
const clock = computed(() => battleClock(props.battle, now.value))
const round = computed(() => Math.min(props.battle.rounds.length, Math.max(1, clock.value.round + 1)))
// who is ahead while it plays, by the mode's rule (most value · least value · the richer team), from the rounds landed
const leaders = computed<number[]>(() => {
  const b = props.battle
  if (b.status !== 'live' || clock.value.round < 1 || !b.results) return []
  const tt = slotTotals(b, clock.value.round)
  if (b.mode === 'team') return tt[0]! + tt[1]! >= tt[2]! + tt[3]! ? [0, 1] : [2, 3]
  const pick = b.mode === 'crazy' ? Math.min(...tt) : Math.max(...tt)
  return [tt.indexOf(pick)]
})
const winners = computed<number[]>(() => (props.battle.status === 'finished' ? (props.battle.winners ?? (props.battle.winnerSlot != null ? [props.battle.winnerSlot] : [])) : []))
// the seats as one stack, or two with VS between in team mode
const sides = computed(() => (props.battle.mode === 'team' ? [props.battle.slots.slice(0, 2), props.battle.slots.slice(2)] : [props.battle.slots]))
const guestJoin = computed(() => props.battle.status === 'waiting' && !session.user)
const action = computed(() => (guestJoin.value ? 'pvp.signInToJoin' : { waiting: 'pvp.join', live: 'pvp.watch', finished: 'pvp.view' }[props.battle.status]))
const modeTip = computed(() => t(`pvp.modeTip.${props.battle.mode}`))
// a guest's Join opens the sign-in instead of a room they cannot sit in
function onClick(e: MouseEvent) {
  if (!guestJoin.value) return
  e.preventDefault()
  ui.openSignIn()
}
</script>

<template>
  <NuxtLink
    :to="`/pvp/${battle.id}`"
    class="kd-bcard kd-spotlight group relative flex min-w-0 flex-col rounded-5xl border"
    :class="[`is-${battle.mode}`, battle.status === 'finished' && 'is-finished', compact ? 'gap-2 p-2' : 'gap-2 p-4']"
    @pointermove="onPointerMove"
    @click="onClick"
  >
    <!-- the mode's light, out of the top left corner -->
    <span class="kd-bcard-wash pointer-events-none absolute inset-0 rounded-5xl" aria-hidden="true" />

    <!-- top: the mode, and what is at stake -->
    <div class="relative flex items-center justify-between gap-2">
      <UiTooltip :text="modeTip" class="min-w-0">
        <span class="flex min-w-0 items-center" :class="compact ? 'gap-1.5' : 'gap-2'" :aria-label="modeTip">
          <span class="kd-mode grid shrink-0 place-items-center" :class="compact ? 'size-7 rounded-md' : 'size-8 rounded-lg'">
            <UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="compact ? 16 : 18" />
          </span>
          <span class="kd-mode-name truncate" :class="compact ? 'type-10-caps' : 'type-14-caps'">{{ $t(`pvp.modeName.${battle.mode}`) }}</span>
        </span>
      </UiTooltip>
      <span class="kd-bcard-pill flex shrink-0 items-center gap-1 tabular-nums" :class="compact ? 'h-7 rounded-md px-1.5 type-12' : 'h-8 rounded-lg px-2 type-14'">
        <template v-if="battle.status === 'live'">
          <span class="kd-live-dot size-1.5 rounded-full bg-danger" /><span class="text-danger">{{ $t('pvp.roundShort', { n: round, of: battle.rounds.length }) }}</span>
        </template>
        <span v-else-if="battle.status === 'finished'" class="text-neutral-12" :class="compact ? 'type-10-caps' : 'type-12-caps'">{{ $t('pvp.ended') }}</span>
        <UiPrice v-else :amount="pot" size="s" tone="coin" compact :title="$t('pvp.pot')" />
      </span>
    </div>

    <!-- the cases, each once; two rows fade into the card under the players, one row keeps them below -->
    <div class="relative" :class="!twoRows && 'flex flex-col gap-2'">
      <div class="kd-bcard-grid grid" :class="[compact ? 'gap-1' : 'gap-2', twoRows && 'is-fading']" :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }">
        <span v-for="c in tiles" :key="c.slug" class="kd-bcard-tile relative grid place-items-center" :class="[twoRows ? 'aspect-square' : compact ? 'h-24' : 'h-36', compact ? 'rounded-lg' : 'rounded-xl']" :title="c.qty > 1 ? `${c.name} ×${c.qty}` : c.name">
          <img :src="c.image" :alt="c.name" draggable="false" class="kd-bcard-case object-contain" :class="twoRows ? 'size-[88%]' : 'h-[88%] max-w-[92%]'" />
          <span v-if="c.qty > 1" class="kd-bcard-qty absolute tabular-nums" :class="compact ? 'type-10-caps top-0.5 right-0.5 rounded px-1' : 'type-12 top-1 right-1 rounded-md px-1.5 py-px'">×{{ c.qty }}</span>
        </span>
        <span v-for="n in blanks" :key="`e${n}`" class="kd-bcard-tile aspect-square" :class="compact ? 'rounded-lg' : 'rounded-xl'" />
      </div>
      <div class="flex items-center justify-center" :class="[twoRows && 'absolute inset-x-0', twoRows && (compact ? 'bottom-1' : 'bottom-3'), compact ? 'gap-1' : 'gap-2']">
        <template v-for="(side, k) in sides" :key="k">
          <span v-if="k > 0" class="type-12-caps text-neutral-14">{{ $t('pvp.vs') }}</span>
          <span class="flex items-center">
            <template v-for="s in side" :key="s.slot">
              <span
                v-if="s.player"
                class="kd-bcard-av relative first:ml-0"
                :class="[compact ? '-ml-1.5 size-7' : '-ml-2 size-9', leaders.includes(s.slot) && 'is-lead', winners.includes(s.slot) && 'is-won', battle.status === 'finished' && !winners.includes(s.slot) && 'is-lost']"
                :title="s.player.nickname"
              >
                <span class="block size-full overflow-hidden rounded-full bg-neutral-7">
                  <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
                </span>
                <UiIcon v-if="leaders.includes(s.slot) || winners.includes(s.slot)" name="crown-fill" :size="compact ? 12 : 14" class="kd-bcard-crown absolute left-1/2 -translate-x-1/2" :class="compact ? '-top-2.5' : '-top-3'" />
              </span>
              <span v-else class="kd-bcard-av grid place-items-center rounded-full bg-neutral-4 text-neutral-11 first:ml-0" :class="compact ? '-ml-1.5 size-7' : '-ml-2 size-9'">
                <UiIcon name="plus" :size="compact ? 12 : 14" />
              </span>
            </template>
          </span>
        </template>
      </div>
    </div>

    <!-- the action, its 8 px corners concentric with the card's 24 -->
    <span class="kd-btn relative mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg" :class="[battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary', compact ? 'type-12-caps h-10' : 'type-14-caps mt-1 h-12']">
      {{ $t(action) }}
      <span v-if="battle.status === 'waiting' && !guestJoin" class="btn-value"><UiPrice :amount="battle.cost" :size="compact ? 's' : 'm'" tone="inverse" /></span>
    </span>
  </NuxtLink>
</template>

<style scoped>
.kd-bcard {
  --mc: var(--color-coin);
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-2);
  transition:
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}
/* the mode's colour: gold for Classic (the most wins), pink for Crazy (the least wins), blue for the teams */
.kd-bcard.is-crazy {
  --mc: var(--color-item-classified);
}
.kd-bcard.is-team {
  --mc: var(--color-item-milspec);
}
.kd-bcard-wash {
  background: radial-gradient(110% 60% at 0% 0%, color-mix(in srgb, var(--mc) 16%, transparent), transparent 70%);
}
.kd-bcard.is-finished .kd-bcard-wash {
  opacity: 0.4;
}
/* the mode chip: the mode's colour, solid and bright, the icon dark on it */
.kd-mode {
  color: var(--color-neutral-1);
  background: var(--mc);
}
.kd-mode-name {
  color: var(--color-neutral-14);
}
.kd-bcard-pill {
  background: rgb(12 13 16 / 0.6);
}
/* the tiles: white 4% on whatever is under them, empty or not */
.kd-bcard-tile {
  background: rgb(255 255 255 / 0.04);
}
.kd-bcard-qty {
  background: rgb(12 13 16 / 0.8);
  color: var(--color-neutral-14);
}
/* two rows: the fade starts in the first row and eases out, so the players over it stand clear */
.kd-bcard-grid.is-fading {
  mask-image: linear-gradient(180deg, #000 30%, rgb(0 0 0 / 0.7) 48%, rgb(0 0 0 / 0.35) 64%, rgb(0 0 0 / 0.12) 80%, transparent 96%);
}
.kd-bcard-case {
  filter: drop-shadow(0 4px 8px rgb(0 0 0 / 0.45));
  transition: transform var(--dur-slow) var(--ease-spring);
}
.kd-bcard.is-finished .kd-bcard-case {
  filter: brightness(0.6) saturate(0.6);
}
.kd-bcard-av {
  border-radius: 9999px;
  box-shadow: 0 0 0 2px var(--color-neutral-2);
}
/* the one ahead: a ring in the mode's colour and a crown; the winners once it is over: green */
.kd-bcard-av.is-lead {
  z-index: 1;
  box-shadow:
    0 0 0 2px var(--color-neutral-2),
    0 0 0 4px var(--mc);
}
.kd-bcard-av.is-won {
  z-index: 1;
  box-shadow:
    0 0 0 2px var(--color-neutral-2),
    0 0 0 4px var(--color-success);
}
.kd-bcard-av.is-lost {
  opacity: 0.5;
}
.kd-bcard-crown {
  color: var(--color-coin);
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.6));
}
.kd-bcard-av.is-won .kd-bcard-crown {
  color: var(--color-success);
}
@media (hover: hover) {
  .kd-bcard:hover {
    border-color: var(--color-neutral-6);
  }
  .kd-bcard:hover .kd-bcard-case {
    transform: translateY(-2px) scale(1.05);
  }
  .kd-bcard:hover .kd-btn-primary {
    background-position: 100% 0;
  }
  .kd-bcard:hover .kd-btn-secondary {
    background: var(--color-neutral-7);
  }
}
.kd-bcard:active {
  transform: scale(0.99);
}
.kd-live-dot {
  animation: kd-live 1.4s ease-in-out infinite;
}
@keyframes kd-live {
  50% {
    opacity: 0.3;
  }
}
</style>
