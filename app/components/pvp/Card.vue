<script setup lang="ts">
import type { Battle, Rarity } from '#shared/types/api'

// A battle as a row of the lobby's table (version 6, the classic list of skin.club, casehug, key-drop, drop.skin): the
// rounds (the count in the mode's colour; the round now, red, while live), the battle in order, what a seat costs, the
// players (a circle per seat, VS between the teams, + on a free one; the leader crowned while live, the winners in green
// once over) with the mode under them (its rule in a tooltip), and the button: Join (a guest signs in first), Watch or
// View. The strip: open seats show the cases in the order they open (a run of one case as one tile, ×N); live, every
// round has its tile, the ones played show their best drop, the one opening now is marked and lit in the mode's colour,
// and the strip slides along with it; once over, every tile is a drop. Phones: the same row as a card in three lines.
const props = defineProps<{ battle: Battle; compact?: boolean }>()
const now = useClock(1000)
const { onPointerMove } = useSpotlight()
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()

const clock = computed(() => battleClock(props.battle, now.value))
const round = computed(() => Math.min(props.battle.rounds.length, Math.max(1, clock.value.round + 1)))
// rounds whose drops are out: the same moment the room shows them (every round is rolled when the last seat fills)
const landed = computed(() => (props.battle.status === 'finished' ? props.battle.rounds.length : props.battle.status === 'live' ? Math.max(0, clock.value.round) : 0))

type Tile = { key: string; image: string; title: string; qty: number; state: 'next' | 'now' | 'done'; rarity?: Rarity }
const tiles = computed<Tile[]>(() => {
  const b = props.battle
  if (b.status === 'waiting') {
    const runs: Tile[] = []
    b.rounds.forEach((r, i) => {
      const last = runs.at(-1)
      if (last && b.rounds[i - 1]!.slug === r.slug) last.qty += 1
      else runs.push({ key: `r${i}`, image: r.image, title: r.name, qty: 1, state: 'next' })
    })
    for (const r of runs) if (r.qty > 1) r.title += ` ×${r.qty}`
    return runs
  }
  return b.rounds.map((r, i) => {
    const drops = i < landed.value ? b.results?.[i]?.drops : null
    if (drops?.length) {
      const top = drops.reduce((a, d) => (d.price > a.price ? d : a))
      return { key: `r${i}`, image: top.image, title: `${top.weapon} | ${top.skin}`, qty: 1, state: 'done', rarity: top.rarity }
    }
    return { key: `r${i}`, image: r.image, title: r.name, qty: 1, state: b.status === 'live' && i === landed.value ? 'now' : 'next' }
  })
})
// Live, the strip slides so the round opening now sits second (the last one played stays in sight); it stops once the
// last tile is in view. Transform only.
const TILE_GAP = 6
const tileSize = computed(() => (props.compact ? 56 : 64))
const step = computed(() => tileSize.value + TILE_GAP)
const viewport = useTemplateRef<HTMLElement>('viewport')
const { width: viewW } = useElementSize(viewport)
const fits = computed(() => Math.max(1, Math.floor((viewW.value + TILE_GAP) / step.value)))
const shift = computed(() => (props.battle.status === 'live' ? Math.min(Math.max(0, landed.value - 1), Math.max(0, tiles.value.length - fits.value)) : 0))
// more tiles than fit: the strip's end fades out
const overflows = computed(() => tiles.value.length - shift.value > fits.value)
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
  <!-- phones: a card in three lines (rounds and price · the strip · players and the button); desktop: one row of the
       lobby's table, in its columns (the header's widths in pages/pvp/index.vue) -->
  <NuxtLink
    :to="`/pvp/${battle.id}`"
    class="kd-brow kd-spotlight group relative grid min-w-0 items-center gap-x-4 gap-y-2 rounded-3xl border p-3 lg:rounded-2xl lg:py-2"
    :class="[`is-${battle.mode}`, `is-${battle.status}`]"
    @pointermove="onPointerMove"
    @click.capture="onClick"
  >
    <!-- rounds: the count in the mode's colour (the round now, red, while live), the status under it -->
    <div class="kd-brow-rounds flex items-center gap-2.5 lg:flex-col lg:gap-1">
      <span class="kd-brow-count type-16-caps grid size-11 shrink-0 place-items-center rounded-xl tabular-nums lg:size-12">
        <template v-if="battle.status === 'live'">{{ round }}/{{ battle.rounds.length }}</template>
        <template v-else>{{ battle.rounds.length }}</template>
      </span>
      <span v-if="battle.status === 'live'" class="type-10-caps flex items-center gap-1 text-danger"><span class="kd-live-dot size-1.5 rounded-full bg-danger" />{{ $t('pvp.live') }}</span>
      <span v-else-if="battle.status === 'finished'" class="type-10-caps text-neutral-11">{{ $t('pvp.ended') }}</span>
      <span v-else class="type-10-caps text-neutral-11">{{ $t('pvp.rounds') }}</span>
    </div>

    <!-- the battle in order: a tile per round -->
    <div ref="viewport" class="kd-brow-strip relative min-w-0 overflow-hidden py-2">
      <div class="kd-strip flex" :style="{ gap: `${TILE_GAP}px`, transform: `translateX(${-shift * step}px)` }">
        <span
          v-for="tl in tiles"
          :key="tl.key"
          class="kd-tile relative grid shrink-0 place-items-center rounded-xl"
          :class="`is-${tl.state}`"
          :style="{ width: `${tileSize}px`, height: `${tileSize}px`, '--rc': tl.rarity ? RARITY_COLOR[tl.rarity] : undefined }"
          :title="tl.title"
        >
          <Transition name="kd-tile" mode="out-in">
            <img :key="tl.image" :src="tl.image" alt="" draggable="false" class="kd-tile-img size-[86%] object-contain" />
          </Transition>
          <span v-if="tl.qty > 1" class="kd-bcard-qty type-10-caps absolute right-1 bottom-1 rounded px-0.5 tabular-nums">×{{ tl.qty }}</span>
          <span v-if="tl.state === 'now'" class="kd-tile-mark absolute left-1/2 -top-2" aria-hidden="true" />
        </span>
      </div>
      <span v-if="overflows" class="kd-strip-fade pointer-events-none absolute inset-y-0 right-0 w-10" aria-hidden="true" />
    </div>

    <!-- what a seat costs (phones: top right, beside the rounds) -->
    <div class="kd-brow-cost flex justify-end lg:justify-center">
      <UiPrice :amount="battle.cost" size="m" tone="coin" :title="$t('pvp.cost')" />
    </div>

    <!-- the players: a circle per seat, VS between the teams, + on a free one; the mode under them -->
    <div class="kd-brow-players flex min-w-0 flex-col gap-1.5 lg:items-center">
      <div class="flex items-center gap-1">
        <template v-for="(side, k) in sides" :key="k">
          <span v-if="k > 0" class="type-10-caps mx-0.5 text-neutral-11">{{ $t('pvp.vs') }}</span>
          <template v-for="s in side" :key="s.slot">
            <span
              v-if="s.player"
              class="kd-bcard-av relative size-8"
              :class="[leaders.includes(s.slot) && 'is-lead', winners.includes(s.slot) && 'is-won', battle.status === 'finished' && !winners.includes(s.slot) && 'is-lost']"
              :title="s.player.nickname"
            >
              <span class="block size-full overflow-hidden rounded-full bg-neutral-7">
                <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
              </span>
              <UiIcon v-if="leaders.includes(s.slot) || winners.includes(s.slot)" name="crown-fill" :size="12" class="kd-bcard-crown absolute -top-2.5 left-1/2 -translate-x-1/2" />
            </span>
            <span v-else class="kd-bcard-av kd-brow-free relative grid size-8 place-items-center rounded-full border border-dashed">
              <UiIcon name="plus" :size="14" />
            </span>
          </template>
        </template>
      </div>
      <UiTooltip :text="modeTip" class="w-fit">
        <span class="kd-brow-mode type-10-caps flex items-center gap-1" :aria-label="modeTip">
          <UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="12" />{{ $t(`pvp.modeName.${battle.mode}`) }}
        </span>
      </UiTooltip>
    </div>

    <!-- the action: Join (phones: with the seat's price), Watch or View -->
    <div class="kd-brow-action">
      <span class="kd-btn inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg px-4 type-14-caps" :class="battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary'">
        <UiIcon v-if="battle.status !== 'waiting'" name="eye" :size="16" />
        {{ $t(action) }}
        <span v-if="battle.status === 'waiting' && !guestJoin" class="btn-value lg:hidden"><UiPrice :amount="battle.cost" size="s" tone="inverse" /></span>
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.kd-brow {
  --mc: var(--color-coin);
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-2);
  transition:
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}
/* the mode's colour: gold for Classic (the most wins), pink for Crazy (the least wins), blue for the teams */
.kd-brow.is-crazy {
  --mc: var(--color-item-classified);
}
.kd-brow.is-team {
  --mc: var(--color-item-milspec);
}
/* phones: rounds and price on top, the strip, then players and the button; desktop: the table's five columns */
.kd-brow {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'rounds cost'
    'strip strip'
    'players action';
}
@media (min-width: 64rem) {
  .kd-brow {
    /* the lobby's header sets the same columns (pages/pvp/index.vue) */
    grid-template-columns: var(--pvp-cols, 72px minmax(0, 1fr) 112px 200px 152px);
    grid-template-areas: 'rounds strip cost players action';
  }
}
.kd-brow-rounds {
  grid-area: rounds;
}
.kd-brow-strip {
  grid-area: strip;
}
.kd-brow-cost {
  grid-area: cost;
}
.kd-brow-players {
  grid-area: players;
}
.kd-brow-action {
  grid-area: action;
}
/* the mode's light from behind the rounds, soft, on the whole row */
.kd-brow:not(.is-finished) {
  background:
    radial-gradient(22% 90% at 0% 50%, color-mix(in srgb, var(--mc) 14%, transparent), transparent),
    var(--color-neutral-2);
}
/* the rounds' count: a tile in the mode's colour; red while live */
.kd-brow-count {
  color: var(--color-neutral-15);
  background: color-mix(in srgb, var(--mc) 16%, var(--color-neutral-3));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mc) 45%, transparent);
}
.kd-brow.is-live .kd-brow-count {
  color: var(--color-danger);
}
.kd-brow.is-finished .kd-brow-count {
  background: var(--color-neutral-3);
  box-shadow: none;
  color: var(--color-neutral-11);
}
.kd-brow-mode {
  color: var(--mc);
}
.kd-brow-free {
  border-color: var(--color-neutral-8);
  background: var(--color-neutral-3);
  color: var(--color-neutral-11);
}
.kd-brow.is-waiting:hover .kd-brow-free {
  border-color: var(--color-brand-base);
  color: var(--color-brand-light);
}
/* the strip slides with the round (transform only) */
.kd-strip {
  transition: transform var(--dur-slow) var(--ease-out);
}
/* a tile per round, white 4%. Next: the case, dimmed. Now: lit in the mode's colour, a little bigger, marked above,
   floating. Played: its best drop on the drop's rarity, a line of that colour along the bottom */
.kd-tile {
  background: rgb(255 255 255 / 0.04);
}
.kd-tile-img {
  filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.45));
  transition: transform var(--dur-slow) var(--ease-spring);
}
.kd-tile.is-next .kd-tile-img {
  opacity: 0.55;
}
.kd-brow:not(.is-live) .kd-tile.is-next .kd-tile-img {
  opacity: 1;
}
.kd-tile.is-now {
  background: radial-gradient(closest-side, color-mix(in srgb, var(--mc) 34%, transparent), color-mix(in srgb, var(--mc) 8%, transparent));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mc) 60%, transparent);
}
.kd-tile.is-now .kd-tile-img {
  animation: kd-tile-float 1.4s var(--ease-in-out) infinite;
}
@keyframes kd-tile-float {
  0%,
  100% {
    transform: scale(1.1) translateY(1px);
  }
  50% {
    transform: scale(1.1) translateY(-3px);
  }
}
.kd-tile-mark {
  width: 10px;
  height: 6px;
  translate: -50% 0;
  background: var(--mc);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}
.kd-tile.is-done {
  background: color-mix(in srgb, var(--rc) 14%, transparent);
  box-shadow: inset 0 -2px 0 var(--rc);
}
.kd-brow.is-finished .kd-tile {
  opacity: 0.75;
}
/* a round lands: the case gives way to its drop */
.kd-tile-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-tile-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-tile-enter-from {
  opacity: 0;
  transform: scale(0.6);
}
.kd-tile-leave-to {
  opacity: 0;
  transform: scale(1.2);
}
/* more rounds than fit: the strip fades into the card */
.kd-strip-fade {
  background: linear-gradient(to right, transparent, var(--color-neutral-2));
}
.kd-bcard-qty {
  background: var(--color-neutral-1);
  color: var(--color-neutral-14);
  line-height: 12px;
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
    0 0 0 3.5px var(--mc);
}
.kd-bcard-av.is-won {
  z-index: 1;
  box-shadow:
    0 0 0 2px var(--color-neutral-2),
    0 0 0 3.5px var(--color-success);
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
  .kd-brow:hover {
    border-color: var(--color-neutral-6);
  }
  .kd-brow:hover .kd-tile:not(.is-now) .kd-tile-img {
    transform: translateY(-2px) scale(1.05);
  }
  .kd-brow:hover .kd-btn-primary {
    background-position: 100% 0;
  }
  .kd-brow:hover .kd-btn-secondary {
    background: var(--color-neutral-7);
  }
}
.kd-brow:active {
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
