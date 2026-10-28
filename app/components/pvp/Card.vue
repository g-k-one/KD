<script setup lang="ts">
import type { Battle, Rarity } from '#shared/types/api'

// A battle as a line of the battle table (components/pvp/Table.vue), built like the game history's table
// (components/history/Table.vue) so the two read the same: the mode (its icon on its colour, the name), the rounds
// (the round now, red, while live), the battle in order, the players, what a seat costs, and the action as a small
// chip on the right — Join (a guest signs in first), Watch or View. The strip: open seats show the cases in the order
// they open (a run of one case as one thumb, ×N); live, the rounds played show their best drop on its rarity (the
// history's thumb), the one opening now is ringed and marked in the mode's colour, and the strip slides along with it;
// once over, every thumb is a drop. Phones: three lines — the mode with the rounds under it and the price · the strip ·
// the players and the action.
const props = defineProps<{ battle: Battle }>()
const now = useClock(1000)
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
// last thumb is in view. Transform only. The thumbs are the history table's, larger (the cases are what a battle is):
// 64 × 56 on desktop, 52 × 46 on phones, 10 px corners.
const isLg = useMediaQuery('(min-width: 1024px)')
const thumb = computed(() => (isLg.value ? { w: 64, h: 56 } : { w: 52, h: 46 }))
const THUMB_GAP = 6
const step = computed(() => thumb.value.w + THUMB_GAP)
const viewport = useTemplateRef<HTMLElement>('viewport')
const { width: viewW } = useElementSize(viewport)
const fits = computed(() => Math.max(1, Math.floor((viewW.value + THUMB_GAP) / step.value)))
const shift = computed(() => (props.battle.status === 'live' ? Math.min(Math.max(0, landed.value - 1), Math.max(0, tiles.value.length - fits.value)) : 0))
// more thumbs than fit: the strip's end fades out
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
// the seats in a line, or two with VS between in team mode
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
  <li class="kd-tr border-b border-neutral-3 last:border-0" :class="[`is-${battle.mode}`, `is-${battle.status}`]">
    <NuxtLink :to="`/pvp/${battle.id}`" class="kd-tr-hit kd-btr grid w-full items-center gap-x-3 gap-y-1 px-2 py-2.5 lg:gap-x-4 lg:px-3 lg:py-0 lg:h-20" @click.capture="onClick">
      <!-- the mode: its icon on its colour and its name (phones: the rounds under it) -->
      <span class="kd-btr-mode flex min-w-0 items-center gap-2.5">
        <UiTooltip :text="modeTip" class="shrink-0">
          <span class="kd-btr-icon grid size-9 place-items-center rounded-xl" :aria-label="modeTip"><UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="18" /></span>
        </UiTooltip>
        <span class="flex min-w-0 flex-col">
          <span class="type-14 truncate">{{ $t(`pvp.modeName.${battle.mode}`) }}</span>
          <span class="type-12-regular flex items-center gap-1 truncate text-neutral-11 lg:hidden">
            <template v-if="battle.status === 'live'"><span class="kd-live-dot size-1.5 rounded-full bg-danger" /><span class="text-danger">{{ $t('pvp.roundShort', { n: round, of: battle.rounds.length }) }}</span></template>
            <template v-else>{{ $t('pvp.roundsN', { n: battle.rounds.length }) }}<template v-if="battle.status === 'finished'"> · {{ $t('pvp.ended') }}</template></template>
          </span>
        </span>
      </span>

      <!-- the rounds (desktop column) -->
      <span class="kd-btr-rounds type-14 flex items-center gap-1.5 tabular-nums max-lg:hidden">
        <template v-if="battle.status === 'live'"><span class="kd-live-dot size-1.5 rounded-full bg-danger" /><span class="text-danger">{{ round }}/{{ battle.rounds.length }}</span></template>
        <template v-else>{{ battle.rounds.length }}</template>
      </span>

      <!-- the battle in order: a thumb per round -->
      <span ref="viewport" class="kd-btr-strip relative block min-w-0 overflow-hidden py-2">
        <span class="kd-strip flex" :style="{ gap: `${THUMB_GAP}px`, transform: `translateX(${-shift * step}px)` }">
          <span
            v-for="tl in tiles"
            :key="tl.key"
            class="kd-thumb relative grid shrink-0 place-items-center rounded-[10px]"
            :class="`is-${tl.state}`"
            :style="{ width: `${thumb.w}px`, height: `${thumb.h}px`, '--rc': tl.rarity ? RARITY_COLOR[tl.rarity] : undefined }"
            :title="tl.title"
          >
            <Transition name="kd-thumb" mode="out-in">
              <img :key="tl.image" :src="tl.image" alt="" draggable="false" class="kd-thumb-img size-[88%] object-contain" />
            </Transition>
            <span v-if="tl.qty > 1" class="kd-thumb-qty type-10-caps absolute -right-1 -bottom-1 rounded px-0.5 tabular-nums">×{{ tl.qty }}</span>
            <span v-if="tl.state === 'now'" class="kd-thumb-mark absolute left-1/2 -top-1.5" aria-hidden="true" />
          </span>
        </span>
        <span v-if="overflows" class="kd-strip-fade pointer-events-none absolute inset-y-0 right-0 w-8" aria-hidden="true" />
      </span>

      <!-- the players: a circle per seat, VS between the teams, + on a free one -->
      <span class="kd-btr-players flex min-w-0 items-center gap-1">
        <template v-for="(side, k) in sides" :key="k">
          <span v-if="k > 0" class="type-10-caps mx-0.5 text-neutral-11">{{ $t('pvp.vs') }}</span>
          <template v-for="s in side" :key="s.slot">
            <span
              v-if="s.player"
              class="kd-av relative size-8 shrink-0"
              :class="[leaders.includes(s.slot) && 'is-lead', winners.includes(s.slot) && 'is-won', battle.status === 'finished' && !winners.includes(s.slot) && 'is-lost']"
              :title="s.player.nickname"
            >
              <span class="block size-full overflow-hidden rounded-full bg-neutral-7">
                <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
              </span>
              <UiIcon v-if="leaders.includes(s.slot) || winners.includes(s.slot)" name="crown-fill" :size="14" class="kd-av-crown absolute -top-2.5 left-1/2 -translate-x-1/2" />
            </span>
            <span v-else class="kd-av kd-av-free grid size-8 shrink-0 place-items-center rounded-full border border-dashed"><UiIcon name="plus" :size="14" /></span>
          </template>
        </template>
      </span>

      <!-- what a seat costs -->
      <span class="kd-btr-cost type-14 text-right tabular-nums"><UiPrice :amount="battle.cost" /></span>

      <!-- the action: the kit's button — Join the primary, Watch and View the secondary -->
      <span class="kd-btr-action kd-btn type-14-caps inline-flex h-10 min-w-28 items-center justify-center gap-1.5 justify-self-end rounded-lg px-4" :class="battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary'">
        <UiIcon v-if="battle.status !== 'waiting'" name="eye" :size="16" class="shrink-0" />
        {{ $t(action) }}
      </span>
    </NuxtLink>
  </li>
</template>

<style scoped>
.kd-tr {
  --mc: var(--color-coin);
}
/* the mode's colour: gold for Classic (the most wins), pink for Crazy (the least wins), blue for the teams */
.kd-tr.is-crazy {
  --mc: var(--color-item-classified);
}
.kd-tr.is-team {
  --mc: var(--color-item-milspec);
}
/* phones: the mode and the price · the strip · the players and the action; desktop: the table's six columns */
.kd-btr {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'mode cost'
    'strip strip'
    'players action';
}
@media (min-width: 64rem) {
  .kd-btr {
    /* the table's header sets the same columns (components/pvp/Table.vue) */
    grid-template-columns: var(--pvp-cols);
    grid-template-areas: 'mode rounds strip players cost action';
  }
}
.kd-btr-mode {
  grid-area: mode;
}
.kd-btr-rounds {
  grid-area: rounds;
}
.kd-btr-strip {
  grid-area: strip;
}
.kd-btr-players {
  grid-area: players;
}
.kd-btr-cost {
  grid-area: cost;
}
.kd-btr-action {
  grid-area: action;
}
.kd-btr-icon {
  color: var(--mc);
  background: color-mix(in srgb, var(--mc) 16%, var(--color-neutral-3));
}
/* a row is a link: the history's hover */
.kd-tr-hit {
  border-radius: 12px;
  transition: background-color var(--dur-base) var(--ease-out);
}
/* the strip slides with the round (transform only) */
.kd-strip {
  transition: transform var(--dur-slow) var(--ease-out);
}
/* the history's thumb: a case on grey; a drop on its rarity. Live: the rounds to come dimmed, the one now ringed in the
   mode's colour, marked above, floating */
.kd-thumb {
  background: var(--color-neutral-3);
}
.kd-thumb.is-done {
  background: color-mix(in srgb, var(--rc) 18%, var(--color-neutral-3));
}
.kd-thumb-img {
  transition: transform var(--dur-slow) var(--ease-spring);
}
.kd-tr.is-live .kd-thumb.is-next .kd-thumb-img {
  opacity: 0.5;
}
.kd-thumb.is-now {
  background: color-mix(in srgb, var(--mc) 22%, var(--color-neutral-3));
  box-shadow: inset 0 0 0 1px var(--mc);
}
.kd-thumb.is-now .kd-thumb-img {
  animation: kd-thumb-float 1.4s var(--ease-in-out) infinite;
}
@keyframes kd-thumb-float {
  50% {
    transform: translateY(-2px);
  }
}
.kd-thumb-mark {
  width: 8px;
  height: 5px;
  translate: -50% 0;
  background: var(--mc);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}
.kd-thumb-qty {
  background: var(--color-neutral-1);
  color: var(--color-neutral-14);
  line-height: 12px;
}
.kd-tr.is-finished .kd-thumb {
  opacity: 0.75;
}
/* a round lands: the case gives way to its drop */
.kd-thumb-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-thumb-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-thumb-enter-from {
  opacity: 0;
  transform: scale(0.6);
}
.kd-thumb-leave-to {
  opacity: 0;
  transform: scale(1.2);
}
/* more rounds than fit: the strip fades into the table */
.kd-strip-fade {
  background: linear-gradient(to right, transparent, var(--color-neutral-2));
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-av {
  border-radius: 9999px;
  box-shadow: 0 0 0 2px var(--color-neutral-2);
}
.kd-av-free {
  border-color: var(--color-neutral-8);
  background: var(--color-neutral-3);
  color: var(--color-neutral-11);
}
/* the one ahead: a ring in the mode's colour and a crown; the winners once it is over: green */
.kd-av.is-lead {
  box-shadow:
    0 0 0 2px var(--color-neutral-2),
    0 0 0 3.5px var(--mc);
}
.kd-av.is-won {
  box-shadow:
    0 0 0 2px var(--color-neutral-2),
    0 0 0 3.5px var(--color-success);
}
.kd-av.is-lost {
  opacity: 0.5;
}
.kd-av-crown {
  color: var(--color-coin);
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.6));
}
.kd-av.is-won .kd-av-crown {
  color: var(--color-success);
}
@media (hover: hover) {
  .kd-tr-hit:hover {
    background: var(--color-neutral-3);
  }
  .kd-tr-hit:hover .kd-strip-fade {
    opacity: 0;
  }
  .kd-tr-hit:hover .kd-thumb {
    background: var(--color-neutral-4);
  }
  .kd-tr-hit:hover .kd-thumb.is-done {
    background: color-mix(in srgb, var(--rc) 18%, var(--color-neutral-4));
  }
  /* the row's hover reaches its button, as on the battle cards */
  .kd-tr-hit:hover .kd-btn-primary {
    background-position: 100% 0;
  }
  .kd-tr-hit:hover .kd-btn-secondary {
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
