<script setup lang="ts">
import type { Battle } from '#shared/types/api'

/*
 * Lobby card for one battle (replaces the thin row). Big enough to read from across the room:
 *   top     — mode, status (waiting pulses, live has a red dot and a progress line on the card's edge), viewers
 *   cases   — the case art fanned out with ×qty, spreads on hover
 *   seats   — big avatars; waiting: empty seats pulse "join me"; live: a race bar under every player with
 *             the leader crowned; finished: the winner glows gold, the rest step back
 *   bottom  — the pot, the seat price and the action (Join / Watch / View)
 */
const props = defineProps<{ battle: Battle }>()
const now = useClock(500)

const groups = computed(() => groupRounds(props.battle.rounds))
const fan = computed(() => groups.value.slice(0, 4))
const pot = computed(() => props.battle.cost * props.battle.size)
const clock = computed(() => battleClock(props.battle, now.value))
const isLive = computed(() => props.battle.status === 'live' && clock.value.round >= 0 && clock.value.round < props.battle.rounds.length)
const progress = computed(() => (isLive.value ? Math.min(1, (clock.value.round + clock.value.inRound / props.battle.roundMs) / props.battle.rounds.length) : 0))
const shownRound = computed(() => (props.battle.status === 'finished' ? props.battle.rounds.length : Math.max(0, clock.value.round)))
const totals = computed(() => slotTotals(props.battle, shownRound.value))
const maxTotal = computed(() => Math.max(1, ...totals.value))
const leader = computed(() => {
  if (props.battle.status === 'finished') return props.battle.winnerSlot
  if (!isLive.value || !Math.max(...totals.value)) return null
  return totals.value.indexOf(Math.max(...totals.value))
})
const joined = computed(() => props.battle.slots.filter((s) => s.player).length)
const action = computed(() => ({ waiting: 'pvp.join', live: 'pvp.watch', finished: 'pvp.view' })[props.battle.status])
</script>

<template>
  <NuxtLink :to="`/pvp/${battle.id}`" class="kd-bcard kd-press group relative flex flex-col gap-4 overflow-hidden rounded-4xl p-4" :class="`is-${battle.status}`">
    <!-- live: the battle's progress runs along the top edge -->
    <span v-if="isLive" class="kd-bcard-progress absolute inset-x-0 top-0 h-0.5 origin-left" :style="{ transform: `scaleX(${progress})` }" />

    <div class="flex items-center gap-2">
      <span class="type-14-caps rounded-lg bg-neutral-4 px-2 py-1">{{ $t(`pvp.modes.${battle.size}`) }}</span>
      <span v-if="battle.status === 'waiting'" class="kd-bstatus is-waiting type-12-caps">{{ $t('pvp.statusWaiting', { joined, size: battle.size }) }}</span>
      <span v-else-if="battle.status === 'live'" class="kd-bstatus is-live type-12-caps"><span class="kd-live-dot" />{{ $t('pvp.statusLive', { round: Math.min(battle.rounds.length, shownRound + 1), rounds: battle.rounds.length }) }}</span>
      <span v-else class="kd-bstatus type-12-caps text-neutral-11">{{ $t('pvp.statusFinished') }}</span>
      <span v-if="battle.viewers" class="type-12 ml-auto flex items-center gap-1 text-neutral-11 tabular-nums"><UiIcon name="eye" :size="14" />{{ battle.viewers }}</span>
    </div>

    <!-- the cases, fanned -->
    <div class="relative flex h-24 items-center justify-center">
      <span
        v-for="(g, i) in fan"
        :key="`${g.slug}-${g.from}`"
        class="kd-fan absolute"
        :class="isLive && clock.round >= g.from && clock.round < g.from + g.qty && 'is-current'"
        :style="{ '--i': i - (fan.length - 1) / 2, zIndex: 10 - Math.abs(i - (fan.length - 1) / 2) * 2 }"
      >
        <img :src="g.image" :alt="g.name" class="size-24 object-contain" :class="battle.status === 'finished' && 'opacity-60'" draggable="false" />
        <span v-if="g.qty > 1" class="type-10-caps absolute right-1 bottom-2 rounded-sm bg-neutral-1/80 px-1 py-0.5">×{{ g.qty }}</span>
      </span>
      <span v-if="groups.length > fan.length" class="type-12 absolute right-0 bottom-0 rounded-md bg-neutral-5 px-2 py-0.5">+{{ groups.length - fan.length }}</span>
    </div>
    <span class="type-12-regular -mt-3 text-center text-neutral-11">{{ $t('pvp.roundsN', { n: battle.rounds.length }) }}</span>

    <!-- seats -->
    <div class="grid gap-2" :style="{ gridTemplateColumns: `repeat(${battle.size}, minmax(0, 1fr))` }">
      <div v-for="s in battle.slots" :key="s.slot" class="kd-seat flex min-w-0 flex-col items-center gap-1.5" :class="[leader === s.slot && 'is-lead', battle.status === 'finished' && leader !== s.slot && 'is-out']">
        <span v-if="s.player" class="kd-seat-ava relative size-12 rounded-full">
          <img :src="s.player.avatar" alt="" class="size-full rounded-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
          <UiIcon v-if="leader === s.slot" name="crown" :size="16" class="kd-crown absolute -top-3 left-1/2 -translate-x-1/2 text-coin" />
        </span>
        <span v-else class="kd-seat-empty grid size-12 place-items-center rounded-full text-neutral-11"><UiIcon name="plus" :size="18" /></span>
        <span class="type-12 max-w-full truncate" :class="s.player ? 'text-neutral-14' : 'text-neutral-10'">{{ s.player?.nickname ?? $t('pvp.freeSeat') }}</span>
        <template v-if="battle.status !== 'waiting'">
          <span class="h-1 w-full overflow-hidden rounded-full bg-neutral-4">
            <span class="kd-race block h-full rounded-full" :style="{ width: `${(totals[s.slot]! / maxTotal) * 100}%` }" />
          </span>
          <UiPrice :amount="totals[s.slot] ?? 0" size="s" :tone="leader === s.slot ? 'coin' : 'default'" />
        </template>
      </div>
    </div>

    <div class="mt-auto flex items-end justify-between gap-3">
      <div class="flex flex-col gap-0.5">
        <span class="type-10-caps text-neutral-11">{{ $t('pvp.value') }}</span>
        <UiPrice :amount="pot" size="xl" />
      </div>
      <span class="kd-btn type-12-caps inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5" :class="battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary'">
        {{ $t(action) }}
        <UiPrice v-if="battle.status === 'waiting'" :amount="battle.cost" size="s" tone="inverse" />
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.kd-bcard {
  background: var(--color-neutral-2);
  transition:
    background-color var(--dur-base) var(--ease-out),
    translate var(--dur-base) var(--ease-spring),
    box-shadow var(--dur-base) var(--ease-out);
}
.kd-bcard.is-live {
  background: linear-gradient(180deg, rgb(240 68 56 / 0.08), var(--color-neutral-2) 45%);
}
.kd-bcard.is-waiting {
  background: linear-gradient(180deg, rgb(255 95 31 / 0.08), var(--color-neutral-2) 45%);
}
@media (hover: hover) {
  .kd-bcard:hover {
    translate: 0 -3px;
    background-color: var(--color-neutral-3);
    box-shadow: 0 16px 32px -16px rgb(0 0 0 / 0.6);
  }
  .kd-bcard:hover .kd-fan {
    translate: calc(var(--i) * 56px) -4px;
    rotate: calc(var(--i) * 9deg);
  }
  .kd-bcard:hover .kd-btn-primary {
    background-position: 100% 0;
  }
}
.kd-bcard-progress {
  background: linear-gradient(90deg, var(--color-danger), var(--color-brand-light));
  transition: transform 500ms linear;
}
.kd-bstatus {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.kd-bstatus.is-waiting {
  color: var(--color-warning);
  animation: kd-wait 1.8s var(--ease-in-out) infinite;
}
@keyframes kd-wait {
  50% {
    opacity: 0.55;
  }
}
.kd-bstatus.is-live {
  color: var(--color-danger);
}
.kd-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--color-danger);
  animation: kd-live 1.4s ease-in-out infinite;
}
@keyframes kd-live {
  50% {
    opacity: 0.3;
    scale: 1.6;
  }
}
/* Case fan */
.kd-fan {
  translate: calc(var(--i) * 44px) 0;
  rotate: calc(var(--i) * 6deg);
  filter: drop-shadow(0 8px 12px rgb(0 0 0 / 0.5));
  transition:
    translate var(--dur-slow) var(--ease-spring),
    rotate var(--dur-slow) var(--ease-spring),
    scale var(--dur-slow) var(--ease-spring);
}
/* The case being opened right now bobs a little in front */
.kd-fan.is-current {
  z-index: 20 !important;
  animation: kd-fan-bob 1.2s var(--ease-in-out) infinite;
}
@keyframes kd-fan-bob {
  50% {
    scale: 1.1;
  }
}
/* Seats */
.kd-seat-ava {
  background: var(--color-neutral-6);
  box-shadow: 0 0 0 2px var(--color-neutral-2);
  transition:
    box-shadow var(--dur-base) var(--ease-out),
    scale var(--dur-base) var(--ease-spring);
}
.kd-seat.is-lead .kd-seat-ava {
  scale: 1.08;
  box-shadow:
    0 0 0 2px var(--color-coin),
    0 0 18px -2px rgb(253 176 34 / 0.6);
}
.kd-seat.is-out {
  opacity: 0.45;
  filter: grayscale(0.7);
}
.kd-crown {
  animation: kd-crown 2s var(--ease-in-out) infinite;
}
@keyframes kd-crown {
  50% {
    translate: -50% -2px;
  }
}
.kd-seat-empty {
  position: relative;
  background: rgb(255 95 31 / 0.1);
  color: var(--color-brand-light);
  animation: kd-seat-call 1.8s var(--ease-in-out) infinite;
}
.kd-seat-empty::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgb(255 95 31 / 0.14);
  opacity: 0;
  animation: kd-glow-pulse 1.8s var(--ease-in-out) infinite;
}
@keyframes kd-seat-call {
  50% {
    scale: 1.06;
  }
}
.kd-race {
  background: linear-gradient(90deg, var(--color-neutral-9), var(--color-neutral-13));
  transition: width 600ms var(--ease-out);
}
.kd-seat.is-lead .kd-race {
  background: linear-gradient(90deg, var(--color-coin), #ffe58a);
}
</style>
