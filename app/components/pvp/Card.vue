<script setup lang="ts">
import type { Battle } from '#shared/types/api'

// A battle as a row of the lobby (components/pvp/Table.vue), on skin.club's row in our colours and corners: the rounds
// (the count in a circle whose rim is a slow gradient turning in the mode's colour; live, red, faster, breathing and
// "1/15"), the battle scenario as case cells (each
// round's case, close together, its name on hover), the players (the mode over a plate of seats) and the cost over the
// button — Join (a guest signs in first), Watch or View. The row is one card in the house's way (24 px, 8 in; phones 20):
// neutral-2, the cases standing on it without tiles. The small print is gone: the button says the status, the seats say
// how many have joined, the coin says it is the cost. Desktop: one 24 px inset all round the 124 px row: the 76 px ring,
// the seats over the mode and the cost over the button all start and end on the same two lines.
// Live, the band shows progress only, as skin.club does: the cases played are dimmed, the one opening now sits between
// the case reel's two orange markers, pressed to the row's top and bottom edges; they glide from case to case, and the
// band slides along with them. No drops here — they are the room's (the lobby gets no results: lighter,
// and nothing to read ahead of the replay). Phones: skin.club's card — rounds and status, the cost and the mode · the
// band · the players and the button.
const props = defineProps<{ battle: Battle }>()
const now = useClock(1000)
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()

const mounted = useMounted()
const clock = computed(() => battleClock(props.battle, now.value))
// the server and the browser read the clock a moment apart: a live battle counts its rounds once mounted
const round = computed(() => (mounted.value ? Math.min(props.battle.rounds.length, Math.max(1, clock.value.round + 1)) : 1))
// rounds played, by the clock alone (the room replays from the same start and round length)
const played = computed(() => (props.battle.status === 'finished' ? props.battle.rounds.length : props.battle.status === 'live' && mounted.value ? Math.max(0, clock.value.round) : 0))

type Cell = { key: string; image: string; name: string; state: 'next' | 'now' | 'done' }
const cells = computed<Cell[]>(() => props.battle.rounds.map((r, i) => ({ key: `r${i}`, image: r.image, name: r.name, state: i < played.value ? 'done' : props.battle.status === 'live' && i === played.value ? 'now' : 'next' })))
// Live, the band slides so the case opening now sits second; it stops once the last cell is in view. Transform only.
// The cell width is CSS (100 / 64 px); the slide is worked out once mounted (the server renders at a phone's width).
const isLg = useMediaQuery('(min-width: 1024px)')
const CELL_GAP = 4
const step = computed(() => (isLg.value ? 100 : 64) + CELL_GAP)
const viewport = useTemplateRef<HTMLElement>('viewport')
const { width: viewW } = useElementSize(viewport)
const fits = computed(() => (mounted.value ? Math.max(1, Math.floor((viewW.value + CELL_GAP) / step.value)) : Infinity))
const shift = computed(() => (props.battle.status === 'live' ? Math.min(Math.max(0, played.value - 1), Math.max(0, cells.value.length - fits.value)) : 0))
// the markers ride on the band: one per case, so the case opening now is the rounds played
const markX = computed(() => Math.min(played.value, props.battle.rounds.length - 1) * step.value)
const overflows = computed(() => mounted.value && (cells.value.length - shift.value) * step.value - CELL_GAP > viewW.value + 1)

const winners = computed<number[]>(() => (props.battle.status === 'finished' ? (props.battle.winners ?? (props.battle.winnerSlot != null ? [props.battle.winnerSlot] : [])) : []))
// the seats in a line, or two with VS between in team mode
const sides = computed(() => (props.battle.mode === 'team' ? [props.battle.slots.slice(0, 2), props.battle.slots.slice(2)] : [props.battle.slots]))
const guestJoin = computed(() => props.battle.status === 'waiting' && !session.user)
const action = computed(() => (guestJoin.value ? 'pvp.signInToJoin' : { waiting: 'pvp.join', live: 'pvp.watch', finished: 'pvp.view' }[props.battle.status]))
const roundsTip = computed(() => (props.battle.status === 'live' ? t('pvp.roundShort', { n: round.value, of: props.battle.rounds.length }) : `${props.battle.rounds.length} ${t('pvp.rounds')}`))
const modeTip = computed(() => t(`pvp.modeTip.${props.battle.mode}`))
// every row's circle has its own place in the turn and its own way round, so a list of them never moves in step
const circle = computed(() => {
  const n = Number(String(props.battle.id).replace(/\D/g, '')) || 0
  return { '--phase': ((n * 0.618) % 1).toFixed(3), '--way': n % 2 ? 'reverse' : 'normal' }
})
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
    class="kd-brow grid min-w-0 gap-1.5 rounded-4xl p-2 lg:h-[124px] lg:rounded-5xl"
    :class="[`is-${battle.mode}`, `is-${battle.status}`]"
    @click.capture="onClick"
  >
    <!-- rounds: the count in a circle -->
    <div class="kd-brow-rounds flex items-center pl-1 lg:justify-center lg:p-0">
      <span class="kd-rounds grid size-11 shrink-0 place-items-center rounded-full lg:size-19" :style="circle" :title="roundsTip">
        <span class="kd-rounds-n tabular-nums" :class="battle.status === 'live' ? 'type-12-caps lg:type-20-caps' : 'type-20-caps lg:type-28'">{{ battle.status === 'live' ? `${round}/${battle.rounds.length}` : battle.rounds.length }}</span>
      </span>
    </div>

    <!-- the battle scenario: one band of case cells -->
    <!-- our card's corners: the row 20 (phones, the case card's) / 24 (desktop), 8 in, so the case tiles sit concentric at
         12 / 16 -->
    <!-- desktop: it reaches the row's top and bottom edges (its 8 px padding), so the markers can press against them -->
    <div ref="viewport" class="kd-brow-band relative min-w-0 overflow-hidden lg:-my-2 lg:py-2">
      <div class="kd-band relative flex h-full" :style="{ gap: `${CELL_GAP}px`, transform: `translateX(${-shift * step}px)` }">
        <div
          v-for="(c, i) in cells"
          :key="c.key"
          class="kd-cell relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl lg:h-full lg:w-[100px] lg:rounded-3xl"
          :class="`is-${c.state}`"
          :style="{ '--i': i }"
          :title="c.name"
        >
          <img :src="c.image" :alt="c.name" draggable="false" class="kd-cell-img size-14 object-contain lg:size-[92px]" />
        </div>
        <span
          v-if="mounted && battle.status === 'live'"
          class="kd-marks pointer-events-none absolute inset-y-0"
          :style="{ left: `${(step - CELL_GAP) / 2}px`, transform: `translateX(${markX}px)` }"
          aria-hidden="true"
        >
          <img src="/img/fx/marker-top.svg" alt="" class="kd-cell-mark is-top absolute left-0" />
          <img src="/img/fx/marker-top.svg" alt="" class="kd-cell-mark is-bottom absolute left-0" />
        </span>
      </div>
      <span v-if="overflows" class="kd-band-fade pointer-events-none absolute inset-y-0 right-0 w-12" aria-hidden="true" />
    </div>

    <!-- phones: two lines with nothing idle: the circle, the cases and the cost with the mode under it, then the seats and the
         button (desktop: the cost sits over the button) -->
    <div class="kd-brow-cost flex flex-col items-end justify-center gap-1 pr-1 lg:hidden">
      <UiPrice :amount="battle.cost" size="m" tone="coin" :title="$t('pvp.cost')" />
      <span class="kd-brow-mode type-12-caps flex items-center gap-1 lg:hidden"><UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="14" />{{ $t(`pvp.modeName.${battle.mode}`) }}</span>
    </div>

    <!-- the players: on desktop the mode over the seats, as the cost stands over the button beside them. One 6 px step
         between every avatar in every mode, on the button's line -->
    <div class="kd-brow-who flex min-w-0 items-center pl-1 lg:h-19 lg:flex-col-reverse lg:justify-between lg:self-center lg:p-0">
      <span class="flex h-10 items-center justify-center gap-1.5 lg:w-full">
        <template v-for="(side, k) in sides" :key="k">
          <span v-if="k > 0" class="type-10-caps text-neutral-11">{{ $t('pvp.vs') }}</span>
          <span class="flex items-center gap-1.5">
          <template v-for="s in side" :key="s.slot">
            <span v-if="s.player" class="kd-av relative size-7" :class="[winners.includes(s.slot) && 'is-won', battle.status === 'finished' && !winners.includes(s.slot) && 'is-lost']" :title="s.player.nickname">
              <span class="block size-full overflow-hidden rounded-full bg-neutral-7">
                <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
              </span>
              <UiIcon v-if="winners.includes(s.slot)" name="crown-fill" :size="12" class="kd-av-crown absolute -top-2.5 left-1/2 -translate-x-1/2" />
            </span>
            <span v-else class="kd-av kd-av-free relative grid size-7 place-items-center rounded-full border border-dashed"><UiIcon name="plus" :size="12" /></span>
          </template>
          </span>
        </template>
      </span>
      <UiTooltip :text="modeTip" class="max-lg:hidden">
        <span class="kd-brow-mode type-14-caps flex items-center gap-1.5" :aria-label="modeTip"><UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="16" />{{ $t(`pvp.modeName.${battle.mode}`) }}</span>
      </UiTooltip>
    </div>

    <!-- the cost over the button, one cell the row's height (phones: the button alone, the cost is on top) -->
    <div class="kd-brow-action flex items-center justify-end lg:h-19 lg:flex-col lg:justify-between lg:self-center lg:pr-4 lg:pl-2 lg:py-0">
      <UiPrice :amount="battle.cost" size="l" tone="coin" class="max-lg:hidden" />
      <span class="kd-btn type-14-caps inline-flex h-10 w-28 items-center justify-center gap-1.5 rounded-lg lg:w-full" :class="battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary'">
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
  --cell: var(--color-neutral-3);
  background: var(--row);
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  grid-template-areas:
    'rounds band band cost'
    'who who action action';
  transition: background-color var(--dur-base) var(--ease-out);
}
/* desktop: rounds · the band · players · cost and button (the header has the same) */
@media (min-width: 64rem) {
  .kd-brow {
    grid-template-columns: var(--pvp-cols, 108px minmax(0, 1fr) 160px 184px);
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
.kd-brow-mode {
  color: var(--mc);
}
/* the rounds' circle: a slow conic gradient turns behind a disc lit softly from the middle in the mode's colour. The disc
   breathes and rolls a hair off-centre on its own beat, so the rim keeps changing, 0.75 to 3 px at most, thick here and
   thin there, never quite with the light. Only transform and opacity move. Live, red, faster, breathing; still and grey
   once over */
.kd-rounds {
  --glow: var(--mc);
  --turn: 7s;
  --rim: 4.6s;
  --breath: 0.965;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: var(--cell);
}
.kd-rounds::before {
  content: '';
  position: absolute;
  inset: -25%;
  z-index: -2;
  background: conic-gradient(from 0deg, transparent 0 15%, var(--glow) 42%, transparent 62%, color-mix(in srgb, var(--glow) 50%, transparent) 86%, transparent);
  animation: kd-rounds-turn var(--turn) linear calc(var(--phase) * var(--turn) * -1) infinite var(--way);
}
.kd-rounds::after {
  content: '';
  position: absolute;
  inset: 1.5px;
  z-index: -1;
  border-radius: inherit;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--glow) 24%, var(--cell)), var(--cell));
  animation:
    kd-rounds-rim var(--rim) linear calc(var(--phase) * var(--rim) * -2) infinite var(--way),
    kd-rounds-breath calc(var(--rim) * 0.7) ease-in-out calc(var(--phase) * var(--rim) * -1) infinite alternate;
}
/* 0.75 px off the edge at the same share on both sizes of the circle */
@media (min-width: 64rem) {
  .kd-rounds {
    --breath: 0.98;
  }
}
.kd-brow.is-live .kd-rounds {
  --glow: var(--color-danger);
  --turn: 2.4s;
  --rim: 1.7s;
}
.kd-brow.is-live .kd-rounds::before {
  animation:
    kd-rounds-turn var(--turn) linear calc(var(--phase) * var(--turn) * -1) infinite var(--way),
    kd-rounds-pulse 1.4s ease-in-out calc(var(--phase) * -1.4s) infinite alternate;
}
.kd-brow.is-finished .kd-rounds {
  --glow: var(--color-neutral-5);
}
.kd-brow.is-finished .kd-rounds::before,
.kd-brow.is-finished .kd-rounds::after {
  animation: none;
}
@keyframes kd-rounds-turn {
  to {
    transform: rotate(1turn);
  }
}
@keyframes kd-rounds-rim {
  from {
    transform: rotate(0) translateY(0.75px);
  }
  to {
    transform: rotate(-1turn) translateY(0.75px);
  }
}
@keyframes kd-rounds-breath {
  to {
    scale: var(--breath);
  }
}
@keyframes kd-rounds-pulse {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-rounds::before,
  .kd-rounds::after,
  .kd-brow.is-live .kd-rounds::before {
    animation: none;
  }
}
.kd-rounds-n {
  position: relative;
  color: var(--color-neutral-15);
}
.kd-brow.is-finished .kd-rounds-n {
  color: var(--color-neutral-11);
}
/* the band: the cases stand on the row itself, no tile under them; played ones dimmed, the one now marked, its case
   lifted. It slides with the round (transform only) */
.kd-band {
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-cell-img {
  filter: drop-shadow(0 8px 10px rgb(0 0 0 / 0.45));
  transition:
    transform var(--dur-slow) var(--ease-spring),
    opacity var(--dur-base) var(--ease-out);
}
.kd-cell.is-done .kd-cell-img {
  opacity: 0.3;
}
.kd-cell.is-now .kd-cell-img {
  transform: scale(1.08);
}
/* the case reel's marker, at row size; the row's edges on desktop (the band's 8 px), the cell's on phones. The pair glides
   on the same beat as the band, transform only */
.kd-marks {
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-cell-mark {
  width: 14px;
  height: 11px;
  max-width: none;
  translate: -50% 0;
}
.kd-cell-mark.is-top {
  top: 0;
}
.kd-cell-mark.is-bottom {
  bottom: 0;
  rotate: 180deg;
}
@media (min-width: 64rem) {
  .kd-cell-mark.is-top {
    top: -8px;
  }
  .kd-cell-mark.is-bottom {
    bottom: -8px;
  }
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
    --cell: var(--color-neutral-4);
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
</style>
