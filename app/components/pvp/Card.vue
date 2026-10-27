<script setup lang="ts">
import type { Battle } from '#shared/types/api'

// A battle as a card (GK's sketch): the top lit in the mode's colour — its icon and name (the rule in a tooltip) on the
// left, the number of cases on the right (the round while live); the battle's cases as a grid of tiles, three a row, the
// second row fading into the card; over that fade the players (a stack per side, VS between the teams, + on a free
// seat); and the one button: Join with the seat's price, Watch, or View. Compact: the same card for a phone's columns.
const props = defineProps<{ battle: Battle; compact?: boolean }>()
const now = useClock(1000)
const { onPointerMove } = useSpotlight()
const { t } = useI18n()

// always six places, two rows of three, so every card is the same height: the rounds in order, empty tiles after the
// last one, and past six the last tile counts the rest (+N, its own case among them)
const SLOTS = 6
const tiles = computed(() => props.battle.rounds.slice(0, SLOTS))
const more = computed(() => (props.battle.rounds.length > SLOTS ? props.battle.rounds.length - (SLOTS - 1) : 0))
const clock = computed(() => battleClock(props.battle, now.value))
const round = computed(() => Math.min(props.battle.rounds.length, Math.max(1, clock.value.round + 1)))
// the seats as one stack, or two with VS between in team mode
const sides = computed(() => (props.battle.mode === 'team' ? [props.battle.slots.slice(0, 2), props.battle.slots.slice(2)] : [props.battle.slots]))
const action = computed(() => ({ waiting: 'pvp.join', live: 'pvp.watch', finished: 'pvp.view' })[props.battle.status])
const modeTip = computed(() => t(`pvp.modeTip.${props.battle.mode}`))
</script>

<template>
  <NuxtLink
    :to="`/pvp/${battle.id}`"
    class="kd-bcard kd-spotlight group relative flex min-w-0 flex-col rounded-5xl border"
    :class="[`is-${battle.mode}`, battle.status === 'finished' && 'is-finished', compact ? 'gap-2 p-2' : 'gap-2 p-4']"
    @pointermove="onPointerMove"
  >
    <!-- the mode's light, out of the top left corner -->
    <span class="kd-bcard-wash pointer-events-none absolute inset-0 rounded-5xl" aria-hidden="true" />

    <!-- top: the mode, and the cases -->
    <div class="relative flex items-center justify-between gap-2">
      <UiTooltip :text="modeTip" class="min-w-0">
        <span class="flex min-w-0 items-center gap-2" :aria-label="modeTip">
          <span class="kd-mode grid shrink-0 place-items-center" :class="compact ? 'size-7 rounded-md' : 'size-8 rounded-lg'">
            <UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="compact ? 16 : 18" />
          </span>
          <span class="kd-mode-name truncate" :class="compact ? 'type-12-caps max-sm:hidden' : 'type-14-caps'">{{ $t(`pvp.modeName.${battle.mode}`) }}</span>
        </span>
      </UiTooltip>
      <span class="kd-bcard-pill flex shrink-0 items-center gap-1 tabular-nums" :class="compact ? 'h-7 rounded-md px-1.5 type-12' : 'h-8 rounded-lg px-2 type-14'" :title="$t('pvp.roundsN', { n: battle.rounds.length })">
        <template v-if="battle.status === 'live'"><span class="kd-live-dot size-1.5 rounded-full bg-danger" /><span class="text-danger">{{ round }}/{{ battle.rounds.length }}</span></template>
        <template v-else><UiIcon name="cases" :size="14" />{{ battle.rounds.length }}</template>
      </span>
    </div>

    <!-- the cases, three a row; the second row fades into the card under the players -->
    <div class="relative">
      <div class="kd-bcard-grid grid grid-cols-3" :class="compact ? 'gap-1' : 'gap-2'">
        <span v-for="(c, i) in tiles" :key="i" class="kd-bcard-tile relative grid aspect-square place-items-center" :class="compact ? 'rounded-lg' : 'rounded-xl'" :title="c.name">
          <img :src="c.image" :alt="c.name" draggable="false" class="kd-bcard-case size-[88%] object-contain" />
          <span v-if="more && i === SLOTS - 1" class="kd-bcard-more absolute inset-0 grid place-items-center text-neutral-15 tabular-nums" :class="compact ? 'type-14-caps rounded-lg' : 'type-16-caps rounded-xl'">+{{ more }}</span>
        </span>
        <span v-for="n in SLOTS - tiles.length" :key="`e${n}`" class="kd-bcard-tile aspect-square" :class="compact ? 'rounded-lg' : 'rounded-xl'" />
      </div>
      <!-- the players, over the fade -->
      <div class="absolute inset-x-0 flex items-center justify-center" :class="compact ? 'bottom-1 gap-1' : 'bottom-3 gap-2'">
        <template v-for="(side, k) in sides" :key="k">
          <span v-if="k > 0" class="type-12-caps text-neutral-14">{{ $t('pvp.vs') }}</span>
          <span class="flex items-center">
            <template v-for="s in side" :key="s.slot">
              <span v-if="s.player" class="kd-bcard-av overflow-hidden rounded-full bg-neutral-7 first:ml-0" :class="compact ? '-ml-1.5 size-7' : '-ml-2 size-9'" :title="s.player.nickname">
                <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
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
    <span class="kd-btn relative mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg" :class="[battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary', compact ? 'type-12-caps mt-1 h-10' : 'type-14-caps mt-2 h-12']">
      {{ $t(action) }}
      <span v-if="battle.status === 'waiting'" class="btn-value"><UiPrice :amount="battle.cost" :size="compact ? 's' : 'm'" tone="inverse" /></span>
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
  background: radial-gradient(120% 70% at 0% 0%, color-mix(in srgb, var(--mc) 32%, transparent), transparent 70%);
}
.kd-bcard.is-finished .kd-bcard-wash {
  opacity: 0.4;
}
/* the mode chip stands on the same light it sits in: a dark base tinted by the mode, and a thin ring of it */
.kd-mode {
  color: var(--mc);
  background: color-mix(in srgb, var(--mc) 40%, var(--color-neutral-1));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mc) 45%, transparent);
}
.kd-mode-name {
  color: var(--mc);
}
.kd-bcard-pill {
  background: rgb(12 13 16 / 0.6);
}
/* the tiles: tinted by the mode; the second row fades into the card */
/* the tiles: white 4% on whatever is under them, empty or not */
.kd-bcard-tile {
  background: rgb(255 255 255 / 0.04);
}
.kd-bcard-more {
  background: rgb(12 13 16 / 0.55);
}
/* the fade starts in the first row and eases out, so the players over it stand clear */
.kd-bcard-grid {
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
  box-shadow: 0 0 0 2px var(--color-neutral-2);
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
