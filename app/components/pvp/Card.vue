<script setup lang="ts">
import type { Battle } from '#shared/types/api'

// A battle as a row of the lobby (components/pvp/Table.vue), on skin.club's row in our colours and corners: the rounds
// (the status over a ring that fills in the mode's colour as the rounds are played, the count in it), the battle
// scenario as case cells (the case big, its name under it; a run of one case as one cell, ×N, while seats are open), the
// players (how many over the seats — overlapping, so four and VS fit — the mode under them) and one cell with the cost
// over the button — Join (a guest signs in first), Watch or View — so the button is not an island in the row.
// Live, the band shows progress only, as skin.club does: the cases played are dimmed, the one opening now is marked and
// lifted, and the band slides along with it. No drops here — they are the room's (the lobby gets no results: lighter,
// and nothing to read ahead of the replay). Phones: skin.club's card — rounds and status, the cost and the mode · the
// band · the players and the button.
const props = defineProps<{ battle: Battle }>()
const now = useClock(1000)
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()

const clock = computed(() => battleClock(props.battle, now.value))
const round = computed(() => Math.min(props.battle.rounds.length, Math.max(1, clock.value.round + 1)))
// rounds played, by the clock alone (the room replays from the same start and round length)
const played = computed(() => (props.battle.status === 'finished' ? props.battle.rounds.length : props.battle.status === 'live' ? Math.max(0, clock.value.round) : 0))

type Cell = { key: string; image: string; name: string; qty: number; state: 'next' | 'now' | 'done' }
const cells = computed<Cell[]>(() => {
  const b = props.battle
  if (b.status === 'waiting') {
    const runs: Cell[] = []
    b.rounds.forEach((r, i) => {
      const last = runs.at(-1)
      if (last && b.rounds[i - 1]!.slug === r.slug) last.qty += 1
      else runs.push({ key: `r${i}`, image: r.image, name: r.name, qty: 1, state: 'next' })
    })
    return runs
  }
  return b.rounds.map((r, i) => ({ key: `r${i}`, image: r.image, name: r.name, qty: 1, state: i < played.value ? 'done' : b.status === 'live' && i === played.value ? 'now' : 'next' }))
})
// Live, the band slides so the case opening now sits second; it stops once the last cell is in view. Transform only.
// The cell width is CSS (132 / 100 px); the slide is worked out once mounted (the server renders at a phone's width).
const mounted = useMounted()
const isLg = useMediaQuery('(min-width: 1024px)')
const CELL_GAP = 4
const step = computed(() => (isLg.value ? 132 : 100) + CELL_GAP)
const viewport = useTemplateRef<HTMLElement>('viewport')
const { width: viewW } = useElementSize(viewport)
const fits = computed(() => (mounted.value ? Math.max(1, Math.floor((viewW.value + CELL_GAP) / step.value)) : Infinity))
const shift = computed(() => (props.battle.status === 'live' ? Math.min(Math.max(0, played.value - 1), Math.max(0, cells.value.length - fits.value)) : 0))
const overflows = computed(() => mounted.value && (cells.value.length - shift.value) * step.value - CELL_GAP > viewW.value + 1)

// the rounds' ring: played of all (open seats: empty; over: full, grey)
const RING_R = 26
const RING_C = 2 * Math.PI * RING_R
const ringDash = computed(() => RING_C * (1 - played.value / Math.max(1, props.battle.rounds.length)))
const winners = computed<number[]>(() => (props.battle.status === 'finished' ? (props.battle.winners ?? (props.battle.winnerSlot != null ? [props.battle.winnerSlot] : [])) : []))
// the seats in a line, or two with VS between in team mode
const sides = computed(() => (props.battle.mode === 'team' ? [props.battle.slots.slice(0, 2), props.battle.slots.slice(2)] : [props.battle.slots]))
const seated = computed(() => props.battle.slots.filter((s) => s.player).length)
const guestJoin = computed(() => props.battle.status === 'waiting' && !session.user)
const action = computed(() => (guestJoin.value ? 'pvp.signInToJoin' : { waiting: 'pvp.join', live: 'pvp.watch', finished: 'pvp.view' }[props.battle.status]))
const status = computed(() => ({ waiting: 'pvp.waiting', live: 'pvp.live', finished: 'pvp.ended' })[props.battle.status])
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
    class="kd-brow grid min-w-0 gap-1 rounded-3xl p-1 lg:h-[140px] lg:rounded-2xl"
    :class="[`is-${battle.mode}`, `is-${battle.status}`]"
    @click.capture="onClick"
  >
    <!-- rounds: the status, the ring with the count in it, "Rounds" -->
    <div class="kd-brow-rounds flex items-center gap-2.5 px-2 pt-2 lg:flex-col lg:justify-center lg:gap-1.5 lg:p-0">
      <span class="kd-brow-status type-10-caps flex items-center gap-1 max-lg:hidden">
        <span v-if="battle.status === 'live'" class="kd-live-dot size-1.5 rounded-full bg-danger" />{{ $t(status) }}
      </span>
      <span class="kd-ring relative grid size-11 shrink-0 place-items-center lg:size-16">
        <svg viewBox="0 0 60 60" class="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="30" cy="30" :r="RING_R" class="kd-ring-track" fill="none" stroke-width="4" />
          <circle cx="30" cy="30" :r="RING_R" class="kd-ring-fill" fill="none" stroke-width="4" stroke-linecap="round" :stroke-dasharray="RING_C" :stroke-dashoffset="ringDash" />
        </svg>
        <span class="kd-ring-n type-16-caps relative tabular-nums lg:type-20-caps">{{ battle.status === 'live' ? round : battle.rounds.length }}</span>
      </span>
      <span class="flex flex-col gap-0.5 lg:items-center">
        <span class="kd-brow-status type-10-caps flex items-center gap-1 lg:hidden"><span v-if="battle.status === 'live'" class="kd-live-dot size-1.5 rounded-full bg-danger" />{{ $t(status) }}</span>
        <span class="type-10-caps text-neutral-11">{{ battle.status === 'live' ? $t('pvp.roundShort', { n: round, of: battle.rounds.length }) : $t('pvp.rounds') }}</span>
      </span>
    </div>

    <!-- the battle scenario: one band of case cells -->
    <!-- phones: 4 px in, so the cells' 16 px corners sit concentric in the card's 24 (desktop: 12 in the row's 16) -->
    <div ref="viewport" class="kd-brow-band relative min-w-0 overflow-hidden px-1 lg:px-0">
      <div class="kd-band flex h-full" :style="{ gap: `${CELL_GAP}px`, transform: `translateX(${-shift * step}px)` }">
        <div
          v-for="(c, i) in cells"
          :key="c.key"
          class="kd-cell relative flex h-[112px] w-[100px] shrink-0 flex-col items-center rounded-2xl px-1.5 pt-1.5 lg:h-full lg:w-[132px] lg:rounded-xl lg:pt-2"
          :class="`is-${c.state}`"
          :style="{ '--i': i }"
          :title="c.qty > 1 ? `${c.name} ×${c.qty}` : c.name"
        >
          <img :src="c.image" alt="" draggable="false" class="kd-cell-img size-[76px] object-contain lg:size-[96px]" />
          <span class="kd-cell-name type-12 mt-auto mb-2 w-full truncate text-center lg:mb-2.5">{{ c.name }}</span>
          <span v-if="c.qty > 1" class="kd-cell-qty type-10-caps absolute top-1.5 right-1.5 rounded-md px-1 tabular-nums">×{{ c.qty }}</span>
          <span v-if="c.state === 'now'" class="kd-cell-mark absolute top-0 left-1/2" aria-hidden="true" />
        </div>
      </div>
      <span v-if="overflows" class="kd-band-fade pointer-events-none absolute inset-y-0 right-0 w-12" aria-hidden="true" />
    </div>

    <!-- phones: the cost top right, the mode under it (desktop: the cost sits over the button) -->
    <div class="kd-brow-cost flex flex-col items-end justify-center gap-1 px-2 pt-2 lg:hidden">
      <UiPrice :amount="battle.cost" size="m" tone="coin" :title="$t('pvp.cost')" />
      <span class="kd-brow-mode type-10-caps flex items-center gap-1 lg:hidden"><UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="12" />{{ $t(`pvp.modeName.${battle.mode}`) }}</span>
    </div>

    <!-- the players: how many over the seats, the mode under them -->
    <div class="kd-brow-who kd-cellbg flex min-w-0 items-center px-2 pb-2 lg:flex-col lg:justify-between lg:rounded-xl lg:px-2 lg:py-3">
      <span class="type-12 text-neutral-11 tabular-nums max-lg:hidden">{{ battle.mode === 'team' ? '2 vs 2' : `${seated}/${battle.size}` }}</span>
      <span class="flex items-center gap-1.5">
        <template v-for="(side, k) in sides" :key="k">
          <span v-if="k > 0" class="type-10-caps text-neutral-11">{{ $t('pvp.vs') }}</span>
          <span class="flex items-center">
          <template v-for="s in side" :key="s.slot">
            <span v-if="s.player" class="kd-av relative -ml-2 size-8 first:ml-0" :class="[winners.includes(s.slot) && 'is-won', battle.status === 'finished' && !winners.includes(s.slot) && 'is-lost']" :title="s.player.nickname">
              <span class="block size-full overflow-hidden rounded-full bg-neutral-7">
                <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
              </span>
              <UiIcon v-if="winners.includes(s.slot)" name="crown-fill" :size="12" class="kd-av-crown absolute -top-2.5 left-1/2 -translate-x-1/2" />
            </span>
            <span v-else class="kd-av kd-av-free relative -ml-2 grid size-8 place-items-center rounded-full border border-dashed first:ml-0"><UiIcon name="plus" :size="14" /></span>
          </template>
          </span>
        </template>
      </span>
      <UiTooltip :text="modeTip" class="max-lg:hidden">
        <span class="kd-brow-mode type-10-caps flex items-center gap-1" :aria-label="modeTip"><UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="12" />{{ $t(`pvp.modeName.${battle.mode}`) }}</span>
      </UiTooltip>
    </div>

    <!-- the cost over the button, one cell the row's height (phones: the button alone, the cost is on top) -->
    <div class="kd-brow-action kd-cellbg flex items-center justify-end px-2 pb-2 lg:flex-col lg:justify-center lg:gap-3 lg:rounded-xl lg:px-4 lg:py-3">
      <span class="flex flex-col items-center gap-0.5 max-lg:hidden">
        <span class="type-10-caps text-neutral-11">{{ $t('pvp.cost') }}</span>
        <UiPrice :amount="battle.cost" size="l" tone="coin" />
      </span>
      <span class="kd-btn type-14-caps inline-flex h-10 w-32 items-center justify-center gap-1.5 rounded-lg lg:w-full" :class="battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary'">
        <UiIcon v-if="battle.status !== 'waiting'" name="eye" :size="16" class="shrink-0" />
        {{ $t(action) }}
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.kd-brow {
  --mc: var(--color-coin);
  --row: var(--color-neutral-2);
  --cell: color-mix(in srgb, var(--color-neutral-1) 55%, var(--color-neutral-2));
  background: var(--row);
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'rounds cost'
    'band band'
    'who action';
  transition: background-color var(--dur-base) var(--ease-out);
}
/* desktop: rounds · the band · players · cost and button (the header has the same) */
@media (min-width: 64rem) {
  .kd-brow {
    grid-template-columns: var(--pvp-cols, 112px minmax(0, 1fr) 168px 184px);
    grid-template-areas: 'rounds band who action';
  }
}
/* the mode's colour: gold for Classic (the most wins), pink for Crazy (the least wins), blue for the teams */
.kd-brow.is-crazy {
  --mc: var(--color-item-classified);
}
.kd-brow.is-team {
  --mc: var(--color-item-milspec);
}
.kd-brow-rounds {
  grid-area: rounds;
}
.kd-brow-band {
  grid-area: band;
}
.kd-brow-cost {
  grid-area: cost;
}
.kd-brow-who {
  grid-area: who;
}
.kd-brow-action {
  grid-area: action;
}
/* the cost's and the players' cells: the band's darker ground (desktop; phones are one card) */
@media (min-width: 64rem) {
  .kd-cellbg {
    background: var(--cell);
  }
}
.kd-brow-status {
  color: var(--color-neutral-11);
}
.kd-brow.is-live .kd-brow-status {
  color: var(--color-danger);
}
.kd-brow-mode {
  color: var(--mc);
}
/* the rounds' ring: a dim track in the mode's colour, filled in it as rounds are played (it steps once a round — no
   animation inside the SVG); the count in it, red while live; grey once over */
.kd-ring-track {
  stroke: color-mix(in srgb, var(--mc) 22%, var(--color-neutral-4));
}
.kd-ring-fill {
  stroke: var(--mc);
}
.kd-ring-n {
  color: var(--color-neutral-15);
}
.kd-brow.is-live .kd-ring-n {
  color: var(--color-danger);
}
.kd-brow.is-finished .kd-ring-fill {
  stroke: var(--color-neutral-8);
}
.kd-brow.is-finished .kd-ring-n {
  color: var(--color-neutral-11);
}
/* the band: a cell per case, each its own dark block (the row shows between them, as on skin.club); played ones dimmed,
   the one now lit in the mode's colour, marked, its case lifted. It slides with the round (transform only) */
.kd-cell {
  background: var(--cell);
}
.kd-band {
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-cell-img {
  filter: drop-shadow(0 8px 10px rgb(0 0 0 / 0.45));
  transition:
    transform var(--dur-slow) var(--ease-spring),
    opacity var(--dur-base) var(--ease-out);
}
.kd-cell-name {
  color: var(--color-neutral-13);
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-cell.is-done .kd-cell-img,
.kd-cell.is-done .kd-cell-name {
  opacity: 0.3;
}
.kd-cell.is-now {
  background:
    radial-gradient(60% 50% at 50% 42%, color-mix(in srgb, var(--mc) 30%, transparent), transparent),
    var(--cell);
}
.kd-cell.is-now .kd-cell-img {
  transform: translateY(-2px) scale(1.12);
}
.kd-cell.is-now .kd-cell-name {
  color: var(--color-neutral-15);
}
.kd-cell-mark {
  width: 12px;
  height: 7px;
  translate: -50% 0;
  background: var(--mc);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}
.kd-cell-qty {
  color: var(--color-neutral-15);
  background: color-mix(in srgb, var(--mc) 55%, var(--color-neutral-3));
  line-height: 16px;
}
.kd-band-fade {
  background: linear-gradient(to right, transparent, var(--row));
}
.kd-brow.is-finished .kd-cell-img {
  opacity: 0.45;
}
/* the seats overlap: each ringed in the ground it sits on (the players' cell on desktop, the card on phones) */
.kd-av {
  --ring: var(--row);
  border-radius: 9999px;
  box-shadow: 0 0 0 2px var(--ring);
}
@media (min-width: 64rem) {
  .kd-av {
    --ring: var(--cell);
  }
}
.kd-av-free {
  border-color: var(--color-neutral-8);
  background: var(--color-neutral-3);
  color: var(--color-neutral-11);
}
.kd-av.is-won {
  z-index: 1;
  box-shadow:
    0 0 0 2px var(--ring),
    0 0 0 3.5px var(--color-success);
}
.kd-av.is-lost {
  opacity: 0.5;
}
.kd-av-crown {
  color: var(--color-success);
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.6));
}
@media (hover: hover) {
  .kd-brow:hover {
    --row: var(--color-neutral-3);
  }
  /* the cases lift in a wave, one after another */
  .kd-brow:hover .kd-cell:not(.is-now, .is-done) .kd-cell-img {
    transform: translateY(-4px) scale(1.05);
    transition-delay: calc(var(--i, 0) * 35ms);
  }
  .kd-brow:hover .kd-btn-primary {
    background-position: 100% 0;
  }
  .kd-brow:hover .kd-btn-secondary {
    background: var(--color-neutral-7);
  }
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
