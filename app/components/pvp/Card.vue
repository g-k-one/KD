<script setup lang="ts">
import type { Battle } from '#shared/types/api'

// A battle as a card, in the case card's language: on top the mode as a coloured icon (its rule in a tooltip) and where
// the battle is; then its cases, each on its own tile so they never run together (×N when a case repeats, +N for the
// rest, over the last case dimmed); the players (a + on a free seat, VS between the teams); the pot and the one action — Join with the seat's
// price, Watch, or View. No dots or bullets between words: only a live battle keeps its pulsing dot.
// Compact: the same card for a phone's two columns (two case tiles, smaller type, tighter padding).
const props = defineProps<{ battle: Battle; compact?: boolean }>()
const now = useClock(1000)
const { onPointerMove } = useSpotlight()
const { t } = useI18n()

const groups = computed(() => groupRounds(props.battle.rounds))
// as many case tiles as fit; when there are more cases, the last tile dims its case under +N, the rounds not shown
const fit = computed(() => (props.compact ? 2 : 3))
const tiles = computed(() => {
  const g = groups.value
  const shown = g.slice(0, fit.value)
  const before = shown.slice(0, -1).reduce((n, x) => n + x.qty, 0)
  const more = g.length > fit.value ? props.battle.rounds.length - before : 0
  return { shown, more }
})
const pot = computed(() => props.battle.cost * props.battle.size)
const clock = computed(() => battleClock(props.battle, now.value))
const round = computed(() => Math.min(props.battle.rounds.length, Math.max(1, clock.value.round + 1)))
const seated = computed(() => props.battle.slots.filter((s) => s.player).length)
const action = computed(() => ({ waiting: 'pvp.join', live: 'pvp.watch', finished: 'pvp.view' })[props.battle.status])
const modeTip = computed(() => t(`pvp.modeTip.${props.battle.mode}`))
</script>

<template>
  <NuxtLink
    :to="`/pvp/${battle.id}`"
    class="kd-bcard kd-spotlight group relative flex min-w-0 flex-col rounded-5xl border"
    :class="[compact ? 'gap-3 p-3' : 'gap-4 p-4', battle.status === 'finished' && 'is-finished']"
    @pointermove="onPointerMove"
  >
    <!-- the mode (an icon in its colour, the rule on hover; phones, with no hover, also name it) and where the battle is -->
    <div class="flex h-8 items-center justify-between gap-2">
      <UiTooltip :text="modeTip">
        <span class="flex items-center gap-2" :aria-label="modeTip">
          <span class="kd-mode grid size-8 shrink-0 place-items-center rounded-lg" :class="`is-${battle.mode}`">
            <UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="18" />
          </span>
          <span class="type-12-caps text-neutral-13 lg:hidden" :class="compact && 'max-sm:hidden'">{{ $t(`pvp.modeName.${battle.mode}`) }}</span>
        </span>
      </UiTooltip>
      <span v-if="battle.status === 'waiting'" class="flex items-center gap-1 text-warning tabular-nums" :class="compact ? 'type-12' : 'type-14'" :title="$t('pvp.waiting')">
        <UiIcon name="user" :size="compact ? 14 : 16" />{{ seated }}/{{ battle.size }}
      </span>
      <span v-else-if="battle.status === 'live'" class="flex items-center gap-1.5 text-danger tabular-nums" :class="compact ? 'type-12-caps' : 'type-12-caps'">
        <span class="kd-live-dot size-1.5 rounded-full bg-danger" />{{ $t('pvp.live') }} {{ round }}/{{ battle.rounds.length }}
      </span>
      <span v-else class="text-neutral-11" :class="compact ? 'type-10-caps' : 'type-12-caps'">{{ $t('pvp.finished') }}</span>
    </div>

    <!-- the cases: one tile each, side by side, so every case reads on its own -->
    <div class="grid gap-2" :style="{ gridTemplateColumns: `repeat(${fit}, minmax(0, 1fr))` }">
      <span v-for="(g, i) in tiles.shown" :key="`${g.slug}-${g.from}`" class="kd-bcard-tile relative grid aspect-square place-items-center overflow-hidden rounded-2xl" :title="g.name">
        <img :src="g.image" :alt="g.name" draggable="false" class="kd-bcard-case size-[86%] object-contain" :class="tiles.more && i === tiles.shown.length - 1 && 'is-under'" />
        <span v-if="tiles.more && i === tiles.shown.length - 1" class="absolute inset-0 grid place-items-center text-neutral-15 tabular-nums" :class="compact ? 'type-16-caps' : 'type-20-caps'" :title="$t('pvp.roundsN', { n: battle.rounds.length })">+{{ tiles.more }}</span>
        <span v-else-if="g.qty > 1" class="type-12 absolute top-1.5 right-1.5 rounded-md bg-neutral-1/80 px-1.5 py-0.5 text-neutral-14 tabular-nums">×{{ g.qty }}</span>
      </span>
    </div>

    <!-- the players: + on a free seat, VS between the teams -->
    <div class="flex items-center justify-center" :class="compact ? 'gap-1' : 'gap-1.5'">
      <template v-for="(s, i) in battle.slots" :key="s.slot">
        <span v-if="battle.mode === 'team' && i === 2" class="type-12-caps px-1 text-neutral-10">{{ $t('pvp.vs') }}</span>
        <span v-if="s.player" class="overflow-hidden rounded-full bg-neutral-7" :class="compact ? 'size-6' : 'size-8'" :title="s.player.nickname">
          <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
        </span>
        <span v-else class="grid place-items-center rounded-full border border-dashed border-neutral-8 text-neutral-11" :class="compact ? 'size-6' : 'size-8'">
          <UiIcon name="plus" :size="compact ? 12 : 14" />
        </span>
      </template>
    </div>

    <!-- the pot and the action -->
    <div class="mt-auto flex flex-col items-stretch gap-2">
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
/* the mode's colour: gold for Classic (the most wins), pink for Crazy (the least wins), blue for the teams */
.kd-mode {
  --mc: var(--color-coin);
  color: var(--mc);
  background: color-mix(in srgb, var(--mc) 16%, var(--color-neutral-3));
}
.kd-mode.is-crazy {
  --mc: var(--color-item-classified);
}
.kd-mode.is-team {
  --mc: var(--color-item-milspec);
}
/* a case's tile: the case lifted off it by a soft shadow; hovering the card lifts them a little */
.kd-bcard-tile {
  background: var(--color-neutral-3);
}
.kd-bcard-case {
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.45));
  transition: transform var(--dur-slow) var(--ease-spring);
}
/* the last tile when there are more cases: its case dimmed under the +N */
.kd-bcard-case.is-under {
  filter: brightness(0.35) blur(1px);
}
/* a finished battle's cases step back by darkening */
.kd-bcard.is-finished .kd-bcard-case {
  filter: brightness(0.6) saturate(0.6);
}
@media (hover: hover) {
  .kd-bcard:hover {
    border-color: var(--color-neutral-6);
  }
  .kd-bcard:hover .kd-bcard-case {
    transform: translateY(-3px) scale(1.04);
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
