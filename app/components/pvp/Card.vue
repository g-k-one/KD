<script setup lang="ts">
import type { Battle } from '#shared/types/api'

// A battle as one picture and one button, like a case card (GK's pick, version 4). No box: the mode's light on the card,
// one line along its top — the mode's chip on the left (its rule in a tooltip), the players in the middle (a stack per
// side, VS between the teams, + on a free seat; the leader ringed with a crown while live, the winners in green once
// over), what is at stake on the right (the pot; the round while live; Ended once over) — the battle's dearest case big
// in the middle, the others as a small strip under it (×N when a case opens more than once). The button says what to
// do: Join with the seat's price (a guest signs in first), Watch, or View. Compact: the same card for a phone's columns.
const props = defineProps<{ battle: Battle; compact?: boolean }>()
const now = useClock(1000)
const { onPointerMove } = useSpotlight()
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()

// every case once, with how many rounds open it; the dearest is the picture, the rest go on the strip
const cases = computed(() => {
  const by = new Map<string, { slug: string; name: string; image: string; price: number; qty: number }>()
  for (const r of props.battle.rounds) {
    const c = by.get(r.slug)
    if (c) c.qty += 1
    else by.set(r.slug, { slug: r.slug, name: r.name, image: r.image, price: r.price, qty: 1 })
  }
  return [...by.values()]
})
const hero = computed(() => cases.value.reduce((a, b) => (b.price > a.price ? b : a)))
const STRIP = 4
const others = computed(() => cases.value.filter((c) => c !== hero.value))
const strip = computed(() => others.value.slice(0, STRIP))
const stripMore = computed(() => others.value.length - strip.value.length)

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
    class="kd-bcard kd-spotlight group relative flex min-w-0 flex-col gap-2 rounded-5xl border p-2"
    :class="[`is-${battle.mode}`, battle.status === 'finished' && 'is-finished']"
    @pointermove="onPointerMove"
    @click.capture="onClick"
  >
    <!-- the stage: the mode's light on the card, its top line 16 px in, on the button's edges -->
    <div class="kd-bcard-stage relative flex flex-col items-center justify-end" :class="compact ? 'h-44 pb-1' : 'h-60 pb-2'">
      <img :src="hero.image" :alt="hero.name" :title="hero.qty > 1 ? `${hero.name} ×${hero.qty}` : hero.name" draggable="false" class="kd-bcard-hero object-contain" :class="compact ? 'size-26' : 'size-38'" />
      <!-- the other cases, small, under the picture; ×N on a case that opens more than once -->
      <div class="relative flex items-center justify-center gap-1" :class="compact ? 'h-6' : 'h-8'">
        <span v-for="c in [hero, ...strip]" :key="c.slug" class="kd-bcard-mini relative grid place-items-center" :class="[compact ? 'size-6 rounded-md' : 'size-8 rounded-lg', c === hero && 'is-hero']" :title="c.qty > 1 ? `${c.name} ×${c.qty}` : c.name">
          <img :src="c.image" alt="" draggable="false" class="size-[86%] object-contain" />
          <span v-if="c.qty > 1" class="kd-bcard-qty type-10-caps absolute -right-1 -bottom-1 rounded px-0.5 tabular-nums">×{{ c.qty }}</span>
        </span>
        <span v-if="stripMore" class="kd-bcard-mini type-12 grid place-items-center text-neutral-12 tabular-nums" :class="compact ? 'size-6 rounded-md' : 'size-8 rounded-lg'">+{{ stripMore }}</span>
      </div>

      <!-- along the top: the mode, the players, what is at stake -->
      <div class="absolute inset-x-2 top-2 flex items-center justify-between gap-1">
        <UiTooltip :text="modeTip" class="shrink-0">
          <span class="kd-mode grid place-items-center" :class="compact ? 'size-7 rounded-md' : 'size-8 rounded-lg'" :aria-label="modeTip">
            <UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="compact ? 16 : 18" />
          </span>
        </UiTooltip>
        <div class="flex min-w-0 items-center" :class="compact ? 'gap-0.5' : 'gap-1.5'">
          <template v-for="(side, k) in sides" :key="k">
            <span v-if="k > 0" class="type-10-caps text-neutral-11">{{ $t('pvp.vs') }}</span>
            <span class="flex items-center">
              <template v-for="s in side" :key="s.slot">
                <span
                  v-if="s.player"
                  class="kd-bcard-av relative first:ml-0"
                  :class="[compact ? '-ml-1.5 size-5' : '-ml-1.5 size-7', leaders.includes(s.slot) && 'is-lead', winners.includes(s.slot) && 'is-won', battle.status === 'finished' && !winners.includes(s.slot) && 'is-lost']"
                  :title="s.player.nickname"
                >
                  <span class="block size-full overflow-hidden rounded-full bg-neutral-7">
                    <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
                  </span>
                  <UiIcon v-if="leaders.includes(s.slot) || winners.includes(s.slot)" name="crown-fill" :size="compact ? 10 : 12" class="kd-bcard-crown absolute left-1/2 -translate-x-1/2" :class="compact ? '-top-2' : '-top-2.5'" />
                </span>
                <span v-else class="kd-bcard-av grid place-items-center rounded-full border border-dashed border-neutral-8 bg-neutral-2 text-neutral-11 first:ml-0" :class="compact ? '-ml-1.5 size-5' : '-ml-1.5 size-7'">
                  <UiIcon name="plus" :size="compact ? 10 : 12" />
                </span>
              </template>
            </span>
          </template>
        </div>
        <span class="kd-bcard-pill flex shrink-0 items-center gap-1 tabular-nums" :class="compact ? 'h-7 rounded-md px-1.5 type-12' : 'h-8 rounded-lg px-2 type-14'">
          <template v-if="battle.status === 'live'">
            <span class="kd-live-dot size-1.5 rounded-full bg-danger" /><span class="text-danger">{{ $t('pvp.roundShort', { n: round, of: battle.rounds.length }) }}</span>
          </template>
          <span v-else-if="battle.status === 'finished'" class="text-neutral-12" :class="compact ? 'type-10-caps' : 'type-12-caps'">{{ $t('pvp.ended') }}</span>
          <UiPrice v-else :amount="pot" size="s" tone="coin" compact :title="$t('pvp.pot')" />
        </span>
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
/* the stage: the mode's light from behind the case, straight on the card, soft */
.kd-bcard-stage {
  background: radial-gradient(60% 55% at 50% 52%, color-mix(in srgb, var(--mc) 22%, transparent), transparent);
}
.kd-bcard.is-finished .kd-bcard-stage {
  background: none;
}
.kd-bcard-hero {
  filter: drop-shadow(0 12px 18px rgb(0 0 0 / 0.5));
  transition: transform var(--dur-slow) var(--ease-spring);
}
.kd-bcard.is-finished .kd-bcard-hero,
.kd-bcard.is-finished .kd-bcard-mini img {
  filter: brightness(0.6) saturate(0.6);
}
/* the strip: small tiles, white 4%; the picture's own case outlined in the mode's colour */
.kd-bcard-mini {
  background: rgb(255 255 255 / 0.04);
}
.kd-bcard-mini.is-hero {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mc) 60%, transparent);
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
  .kd-bcard:hover .kd-bcard-hero {
    transform: translateY(-4px) scale(1.05);
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
