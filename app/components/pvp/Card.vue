<script setup lang="ts">
import type { Battle } from '#shared/types/api'

// A battle as one picture and one button, like a case card. The stage — no box, just the mode's light on the card —
// carries one line along
// its top — the mode's icon on the left (its rule in a tooltip), the players in the middle (a stack per side, VS between
// the teams, + on a free seat), the number of cases on the right (with the round while live) — and the battle's dearest
// case big in the middle. The button says what to do: Join with the seat's price, Watch, or View.
// Compact: the same card for a phone's two columns.
const props = defineProps<{ battle: Battle; compact?: boolean }>()
const now = useClock(1000)
const { onPointerMove } = useSpotlight()
const { t } = useI18n()

// the dearest case is the picture
const hero = computed(() => props.battle.rounds.reduce((a, b) => (b.price > a.price ? b : a)))
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
    class="kd-bcard kd-spotlight group relative flex min-w-0 flex-col gap-2 rounded-5xl border p-2"
    :class="[`is-${battle.mode}`, battle.status === 'finished' && 'is-finished']"
    @pointermove="onPointerMove"
  >
    <!-- the stage: the mode's light on the card, its top line 16 px in, on the button's edges -->
    <div class="kd-bcard-stage relative grid place-items-center" :class="compact ? 'h-40' : 'h-52'">
      <img :src="hero.image" :alt="hero.name" :title="hero.name" draggable="false" class="kd-bcard-hero object-contain" :class="compact ? 'mt-6 size-26' : 'mt-8 size-36'" />

      <!-- along the top: the mode, the players, the cases -->
      <div class="absolute inset-x-2 top-2 flex items-center justify-between gap-1">
        <UiTooltip :text="modeTip" class="shrink-0">
          <span class="kd-mode grid place-items-center" :class="compact ? 'size-6 rounded-md' : 'size-8 rounded-lg'" :aria-label="modeTip">
            <UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="compact ? 14 : 18" />
          </span>
        </UiTooltip>
        <div class="flex min-w-0 items-center" :class="compact ? 'gap-0.5' : 'gap-1.5'">
          <template v-for="(side, k) in sides" :key="k">
            <span v-if="k > 0" class="type-10-caps text-neutral-11">{{ $t('pvp.vs') }}</span>
            <span class="flex items-center">
              <template v-for="s in side" :key="s.slot">
                <span v-if="s.player" class="kd-bcard-av overflow-hidden rounded-full bg-neutral-7 first:ml-0" :class="compact ? '-ml-1.5 size-5' : '-ml-1.5 size-7'" :title="s.player.nickname">
                  <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
                </span>
                <span v-else class="kd-bcard-av grid place-items-center rounded-full border border-dashed border-neutral-8 bg-neutral-2 text-neutral-11 first:ml-0" :class="compact ? '-ml-1.5 size-5' : '-ml-1.5 size-7'">
                  <UiIcon name="plus" :size="compact ? 10 : 12" />
                </span>
              </template>
            </span>
          </template>
        </div>
        <span class="kd-bcard-pill flex shrink-0 items-center gap-1 rounded-lg tabular-nums" :class="compact ? 'h-6 px-1.5 type-12' : 'h-8 px-2 type-14'" :title="$t('pvp.roundsN', { n: battle.rounds.length })">
          <template v-if="battle.status === 'live'"><span class="kd-live-dot size-1.5 rounded-full bg-danger" /><span class="text-danger">{{ round }}/{{ battle.rounds.length }}</span></template>
          <template v-else><UiIcon v-if="!compact" name="cases" :size="14" class="text-neutral-11" />{{ battle.rounds.length }}</template>
        </span>
      </div>
    </div>

    <!-- the action, its 8 px corners 16 px in from the card's 24 -->
    <div class="px-2 pb-2">
      <span class="kd-btn type-12-caps inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg" :class="battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary'">
        {{ $t(action) }}
        <span v-if="battle.status === 'waiting'" class="btn-value"><UiPrice :amount="battle.cost" size="s" tone="inverse" /></span>
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
.kd-mode {
  color: var(--mc);
  background: color-mix(in srgb, var(--mc) 20%, var(--color-neutral-3));
}
/* the stage: the mode's light from the middle, straight on the card */
.kd-bcard-stage {
  background: radial-gradient(closest-side, color-mix(in srgb, var(--mc) 30%, transparent), transparent);
}
.kd-bcard.is-finished .kd-bcard-stage {
  background: none;
}
.kd-bcard-hero {
  filter: drop-shadow(0 12px 18px rgb(0 0 0 / 0.5));
  transition: transform var(--dur-slow) var(--ease-spring);
}
.kd-bcard.is-finished .kd-bcard-hero {
  filter: brightness(0.6) saturate(0.6);
}
/* the glass under the corner count, so it reads over the light */
.kd-bcard-pill {
  background: var(--color-neutral-3);
}
.kd-bcard-av {
  box-shadow: 0 0 0 2px var(--color-neutral-2);
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
