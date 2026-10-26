<script setup lang="ts">
import type { Battle } from '#shared/types/api'

// A battle as a card, in the case card's language: the mode and its status on top, the battle's cases fanned big in
// the middle, the players (a + on a free seat), then the pot and the one action — Join with the seat's price, Watch,
// or View. Compact: the same card for a phone's two columns (smaller art and type, tighter padding).
const props = defineProps<{ battle: Battle; compact?: boolean }>()
const now = useClock(1000)
const { onPointerMove } = useSpotlight()

const groups = computed(() => groupRounds(props.battle.rounds))
// up to three cases fan out; the badge counts the rounds
const fan = computed(() => groups.value.slice(0, 3))
const pot = computed(() => props.battle.cost * props.battle.size)
const clock = computed(() => battleClock(props.battle, now.value))
const round = computed(() => Math.min(props.battle.rounds.length, Math.max(1, clock.value.round + 1)))
const status = computed(() => {
  const b = props.battle
  if (b.status === 'waiting') return { cls: 'text-warning', dot: 'bg-warning', text: `${b.slots.filter((s) => s.player).length}/${b.size}` }
  if (b.status === 'live') return { cls: 'text-danger', dot: 'bg-danger kd-live-dot', text: `${round.value}/${b.rounds.length}` }
  return { cls: 'text-neutral-11', dot: 'bg-neutral-8', text: '' }
})
const action = computed(() => ({ waiting: 'pvp.join', live: 'pvp.watch', finished: 'pvp.view' })[props.battle.status])
</script>

<template>
  <NuxtLink
    :to="`/pvp/${battle.id}`"
    class="kd-bcard kd-spotlight group relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-5xl border"
    :class="[compact ? 'p-3' : 'p-4', battle.status === 'finished' && 'is-finished']"
    @pointermove="onPointerMove"
  >
    <!-- the mode and where the battle is -->
    <div class="flex items-center justify-between gap-2">
      <span :class="compact ? 'type-14-caps' : 'type-16-caps'">{{ $t(`pvp.modeName.${battle.mode}`) }}</span>
      <span class="flex items-center gap-1.5 tabular-nums" :class="[status.cls, compact ? 'type-10-caps' : 'type-12-caps']">
        <span class="size-1.5 rounded-full" :class="status.dot" />
        <span :class="compact && 'max-sm:hidden'">{{ $t(`pvp.${battle.status}`) }}</span><template v-if="status.text"><span :class="compact && 'max-sm:hidden'"> · </span>{{ status.text }}</template>
      </span>
    </div>

    <!-- the cases, fanned -->
    <div class="relative flex items-center justify-center" :class="compact ? 'h-24' : 'h-32 lg:h-36'">
      <img
        v-for="(g, i) in fan"
        :key="`${g.slug}-${g.from}`"
        :src="g.image"
        :alt="g.name"
        draggable="false"
        class="kd-bcard-case object-contain"
        :class="[compact ? 'size-20' : 'size-28 lg:size-32', i === Math.floor((fan.length - 1) / 2) && 'is-front']"
        :style="{ '--i': i - (fan.length - 1) / 2, zIndex: 3 - Math.abs(i - (fan.length - 1) / 2) * 2 }"
      />
      <!-- how many rounds (cases to open), one number: the fan above already shows what they are -->
      <span class="absolute right-0 bottom-0 flex items-center gap-1.5 rounded-lg bg-neutral-3 text-neutral-13 tabular-nums" :class="compact ? 'type-12 px-2 py-1' : 'type-14 px-2.5 py-1'" :title="$t('pvp.roundsN', { n: battle.rounds.length })">
        <UiIcon name="cases" :size="compact ? 14 : 16" class="text-neutral-11" />{{ battle.rounds.length }}
      </span>
    </div>

    <!-- the players: × between seats, VS between the teams, + on a free seat -->
    <div class="flex items-center justify-center gap-1">
      <template v-for="(s, i) in battle.slots" :key="s.slot">
        <span v-if="i > 0" class="type-12 text-neutral-9" aria-hidden="true">{{ battle.mode === 'team' ? (i === 2 ? $t('pvp.vs') : '+') : '×' }}</span>
        <span v-if="s.player" class="overflow-hidden rounded-full bg-neutral-7 ring-2 ring-neutral-2" :class="compact ? 'size-6' : 'size-8'" :title="s.player.nickname">
          <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
        </span>
        <span v-else class="grid place-items-center rounded-full border border-dashed border-neutral-8 text-neutral-11" :class="compact ? 'size-6' : 'size-8'">
          <UiIcon name="plus" :size="compact ? 12 : 14" />
        </span>
      </template>
    </div>

    <!-- the pot and the action -->
    <div class="flex flex-col items-stretch gap-2">
      <div class="flex items-center justify-between gap-2">
        <span class="text-neutral-11" :class="compact ? 'type-10-caps' : 'type-12-caps'">{{ $t('pvp.pot') }}</span>
        <UiPrice :amount="pot" :size="compact ? 's' : 'l'" tone="coin" class="min-w-0" />
      </div>
      <span class="kd-btn type-12-caps inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg" :class="battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary'">
        {{ $t(action) }}
        <span v-if="battle.status === 'waiting'" class="btn-value"><UiPrice :amount="battle.cost" size="s" tone="inverse" /></span>
      </span>
    </div>

  </NuxtLink>
</template>

<style scoped>
.kd-bcard {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-2);
  transition:
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}
/* a finished battle's cases step back by darkening, not by fading: faded pictures showed through each other where they
   overlap. The middle one stays whole */
.kd-bcard.is-finished .kd-bcard-case {
  filter: brightness(0.55) saturate(0.6);
}
.kd-bcard.is-finished .kd-bcard-case.is-front {
  filter: brightness(0.85) saturate(0.85);
}
/* the fan: the middle case in front, the others turned out to the sides */
.kd-bcard-case {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: calc(-50% + var(--i) * 38%) -50%;
  rotate: calc(var(--i) * 10deg);
  scale: calc(1 - max(var(--i), -1 * var(--i)) * 0.12);
  filter: drop-shadow(0 8px 14px rgb(0 0 0 / 0.45));
  transition: translate var(--dur-slow) var(--ease-spring), rotate var(--dur-slow) var(--ease-spring);
}
@media (hover: hover) {
  .kd-bcard:hover {
    border-color: var(--color-neutral-6);
  }
  .kd-bcard:hover .kd-bcard-case {
    translate: calc(-50% + var(--i) * 46%) -52%;
    rotate: calc(var(--i) * 14deg);
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
