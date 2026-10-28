<script setup lang="ts">
import type { Battle, Rarity } from '#shared/types/api'

// A battle as a block with its rounds in a line (version 5, the hybrid: our card, skin.club's round strip). One line
// along the top — the mode's chip on the left (its rule in a tooltip), the players in the middle (a stack per side, VS
// between the teams, + on a free seat; the leader ringed with a crown while live, the winners in green once over), the
// pot on the right (Ended once over). Under it the battle in order: how many rounds, then the strip — open seats show the
// cases in the order they open (a run of one case as one tile, ×N); live, every round has its tile, the ones played show
// their best drop, the one opening now is marked and lit in the mode's colour, and the strip slides along with it; once
// over, every tile is a drop. The button says what to do: Join with the seat's price (a guest signs in first), Watch, or
// View. Compact: the same card at a phone's width.
const props = defineProps<{ battle: Battle; compact?: boolean }>()
const now = useClock(1000)
const { onPointerMove } = useSpotlight()
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()

const pot = computed(() => props.battle.cost * props.battle.size)
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
const tileSize = computed(() => (props.compact ? 56 : 72))
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
  <NuxtLink
    :to="`/pvp/${battle.id}`"
    class="kd-bcard kd-spotlight group relative flex min-w-0 flex-col gap-2 rounded-5xl border p-2"
    :class="[`is-${battle.mode}`, `is-${battle.status}`]"
    @pointermove="onPointerMove"
    @click.capture="onClick"
  >
    <!-- the stage: the mode's light behind the strip, its lines 16 px in, on the button's edges -->
    <div class="kd-bcard-stage relative flex flex-col gap-2 px-2 pt-2">
      <!-- along the top: the mode, the players, the pot -->
      <div class="flex items-center justify-between" :class="compact ? 'gap-1' : 'gap-2'">
        <UiTooltip :text="modeTip" class="shrink-0">
          <span class="kd-mode grid place-items-center size-8 rounded-lg" :aria-label="modeTip">
            <UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="18" />
          </span>
        </UiTooltip>
        <div class="flex min-w-0 items-center gap-1.5">
          <template v-for="(side, k) in sides" :key="k">
            <span v-if="k > 0" class="type-10-caps text-neutral-11">{{ $t('pvp.vs') }}</span>
            <span class="flex items-center">
              <template v-for="s in side" :key="s.slot">
                <span
                  v-if="s.player"
                  class="kd-bcard-av relative first:ml-0"
                  :class="['-ml-1.5 size-7', leaders.includes(s.slot) && 'is-lead', winners.includes(s.slot) && 'is-won', battle.status === 'finished' && !winners.includes(s.slot) && 'is-lost']"
                  :title="s.player.nickname"
                >
                  <span class="block size-full overflow-hidden rounded-full bg-neutral-7">
                    <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
                  </span>
                  <UiIcon v-if="leaders.includes(s.slot) || winners.includes(s.slot)" name="crown-fill" :size="12" class="kd-bcard-crown absolute -top-2.5 left-1/2 -translate-x-1/2" />
                </span>
                <span v-else class="kd-bcard-av relative grid place-items-center rounded-full border border-dashed border-neutral-8 bg-neutral-2 -ml-1.5 size-7 text-neutral-11 first:ml-0">
                  <UiIcon name="plus" :size="12" />
                </span>
              </template>
            </span>
          </template>
        </div>
        <span class="kd-bcard-pill flex shrink-0 items-center gap-1 tabular-nums h-8 rounded-lg px-2 type-14">
          <span v-if="battle.status === 'finished'" class="type-12-caps text-neutral-12">{{ $t('pvp.ended') }}</span>
          <UiPrice v-else :amount="pot" size="s" tone="coin" compact :title="$t('pvp.pot')" />
        </span>
      </div>

      <!-- the battle in order: how many rounds (the round now, red, while live), then a tile per round -->
      <div class="flex items-center gap-3">
        <span class="flex w-12 shrink-0 flex-col items-center gap-0.5 text-center">
          <template v-if="battle.status === 'live'">
            <span class="type-16-caps text-danger tabular-nums">{{ round }}/{{ battle.rounds.length }}</span>
            <span class="type-10-caps flex items-center gap-1 text-danger"><span class="kd-live-dot size-1.5 rounded-full bg-danger" />{{ $t('pvp.round') }}</span>
          </template>
          <template v-else>
            <span class="type-16-caps text-neutral-15 tabular-nums">{{ battle.rounds.length }}</span>
            <span class="type-10-caps text-neutral-11">{{ $t('pvp.rounds') }}</span>
          </template>
        </span>
        <div ref="viewport" class="relative min-w-0 flex-1 overflow-hidden py-2">
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
      </div>
    </div>

    <!-- the action, its 8 px corners 16 px in from the card's 24 -->
    <div class="px-2 pb-2">
      <span class="kd-btn inline-flex w-full items-center justify-center gap-1.5 rounded-lg" :class="[battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary', compact ? 'type-12-caps h-10' : 'type-14-caps h-12']">
        {{ $t(action) }}
        <span v-if="battle.status === 'waiting' && !guestJoin" class="btn-value"><UiPrice :amount="battle.cost" :size="compact ? 's' : 'm'" tone="inverse" /></span>
      </span>
    </div>
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
/* the mode chip: the mode's colour, solid and bright, the icon dark on it */
.kd-mode {
  color: var(--color-neutral-1);
  background: var(--mc);
}
/* the mode's light from behind the strip's start, soft, on the whole card (a box of its own showed its edge) */
.kd-bcard:not(.is-finished) {
  background:
    radial-gradient(38% 46% at 18% 46%, color-mix(in srgb, var(--mc) 14%, transparent), transparent),
    var(--color-neutral-2);
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
.kd-bcard:not(.is-live) .kd-tile.is-next .kd-tile-img {
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
.kd-bcard.is-finished .kd-tile {
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
.kd-bcard-pill {
  background: var(--color-neutral-3);
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
  .kd-bcard:hover {
    border-color: var(--color-neutral-6);
  }
  .kd-bcard:hover .kd-tile:not(.is-now) .kd-tile-img {
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
