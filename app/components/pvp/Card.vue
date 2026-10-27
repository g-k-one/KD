<script setup lang="ts">
import type { Battle } from '#shared/types/api'

// A battle as a card (GK's structure): on top the mode — its icon and name in its colour, the rule in a tooltip — and two
// counts on the right, the seats (or the round while live) and the cases; in the middle the cases fanned, the dearest big
// in front with its neighbours smaller behind on either side; under them the players, big, a stack per side with VS
// between the teams (+ on a free seat); and the one button: Join with the seat's price, Watch, or View.
// Compact: the same card for a phone's two columns.
const props = defineProps<{ battle: Battle; compact?: boolean }>()
const now = useClock(1000)
const { onPointerMove } = useSpotlight()
const { t } = useI18n()

// every case once; the dearest is the front of the fan, two others flank it
const cases = computed(() => {
  const by = new Map<string, { slug: string; name: string; image: string; price: number }>()
  for (const r of props.battle.rounds) if (!by.has(r.slug)) by.set(r.slug, r)
  return [...by.values()]
})
const hero = computed(() => cases.value.reduce((a, b) => (b.price > a.price ? b : a)))
const sideCases = computed(() => cases.value.filter((c) => c !== hero.value).slice(0, 2))

const clock = computed(() => battleClock(props.battle, now.value))
const round = computed(() => Math.min(props.battle.rounds.length, Math.max(1, clock.value.round + 1)))
const seated = computed(() => props.battle.slots.filter((s) => s.player).length)
// the seats as one stack, or two with VS between in team mode
const sides = computed(() => (props.battle.mode === 'team' ? [props.battle.slots.slice(0, 2), props.battle.slots.slice(2)] : [props.battle.slots]))
const action = computed(() => ({ waiting: 'pvp.join', live: 'pvp.watch', finished: 'pvp.view' })[props.battle.status])
const modeTip = computed(() => t(`pvp.modeTip.${props.battle.mode}`))
</script>

<template>
  <NuxtLink
    :to="`/pvp/${battle.id}`"
    class="kd-bcard kd-spotlight group relative flex min-w-0 flex-col rounded-5xl border"
    :class="[`is-${battle.mode}`, battle.status === 'finished' && 'is-finished', compact ? 'gap-2 p-3' : 'gap-3 p-4']"
    @pointermove="onPointerMove"
  >
    <!-- top: the mode, and the counts -->
    <div class="flex items-center justify-between gap-2">
      <UiTooltip :text="modeTip" class="min-w-0">
        <span class="flex min-w-0 items-center gap-2" :aria-label="modeTip">
          <span class="kd-mode grid shrink-0 place-items-center rounded-lg" :class="compact ? 'size-8' : 'size-10'">
            <UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="compact ? 18 : 22" />
          </span>
          <span class="kd-mode-name type-14-caps truncate" :class="compact && 'max-sm:hidden'">{{ $t(`pvp.modeName.${battle.mode}`) }}</span>
        </span>
      </UiTooltip>
      <span class="flex shrink-0 items-center gap-1.5">
        <span v-if="battle.status === 'live'" class="kd-bcard-count text-danger" :class="compact ? 'h-8 px-2 type-12-caps' : 'h-9 px-2.5 type-12-caps'">
          <span class="kd-live-dot size-1.5 rounded-full bg-danger" />{{ round }}/{{ battle.rounds.length }}
        </span>
        <span v-else-if="battle.status === 'waiting'" class="kd-bcard-count" :class="compact ? 'h-8 px-2 type-12' : 'h-9 px-2.5 type-14'" :title="$t('pvp.waiting')">
          <UiIcon name="user" :size="compact ? 14 : 16" />{{ seated }}/{{ battle.size }}
        </span>
        <span class="kd-bcard-count" :class="compact ? 'h-8 px-2 type-12' : 'h-9 px-2.5 type-14'" :title="$t('pvp.roundsN', { n: battle.rounds.length })">
          <UiIcon name="cases" :size="compact ? 14 : 16" />{{ battle.rounds.length }}
        </span>
      </span>
    </div>

    <!-- the cases, fanned: the dearest big in front, two smaller behind on either side -->
    <div class="kd-bcard-fan relative" :class="compact ? 'h-28' : 'h-44'">
      <img
        v-for="(c, i) in sideCases"
        :key="c.slug"
        :src="c.image"
        :alt="c.name"
        :title="c.name"
        draggable="false"
        class="kd-bcard-side absolute object-contain"
        :class="[compact ? 'size-16' : 'size-28', i === 0 ? 'is-left' : 'is-right']"
      />
      <img :src="hero.image" :alt="hero.name" :title="hero.name" draggable="false" class="kd-bcard-hero absolute object-contain" :class="compact ? 'size-28' : 'size-44'" />
    </div>

    <!-- the players: a stack per side, VS between the teams -->
    <div class="flex items-center justify-center" :class="compact ? 'gap-1.5' : 'gap-3'">
      <template v-for="(side, k) in sides" :key="k">
        <span v-if="k > 0" class="type-16-caps text-neutral-14">{{ $t('pvp.vs') }}</span>
        <span class="flex items-center">
          <template v-for="s in side" :key="s.slot">
            <span v-if="s.player" class="kd-bcard-av overflow-hidden rounded-full bg-neutral-7 first:ml-0" :class="compact ? '-ml-2 size-8' : '-ml-3 size-12'" :title="s.player.nickname">
              <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
            </span>
            <span v-else class="kd-bcard-av grid place-items-center rounded-full bg-neutral-4 text-neutral-11 first:ml-0" :class="compact ? '-ml-2 size-8' : '-ml-3 size-12'">
              <UiIcon name="plus" :size="compact ? 14 : 18" />
            </span>
          </template>
        </span>
      </template>
    </div>

    <!-- the action, its 8 px corners 16 px in from the card's 24 -->
    <span class="kd-btn inline-flex w-full items-center justify-center gap-1.5 rounded-lg" :class="[battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary', compact ? 'type-12-caps mt-1 h-10' : 'type-14-caps mt-2 h-12']">
      {{ $t(action) }}
      <span v-if="battle.status === 'waiting'" class="btn-value"><UiPrice :amount="battle.cost" size="s" tone="inverse" /></span>
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
.kd-mode {
  color: var(--mc);
  background: color-mix(in srgb, var(--mc) 20%, var(--color-neutral-3));
}
.kd-mode-name {
  color: var(--mc);
}
.kd-bcard-count {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  background: var(--color-neutral-3);
  font-variant-numeric: tabular-nums;
}
/* the fan: the front case centred and lifted, the side ones lower, turned out and a step back */
.kd-bcard-hero {
  left: 50%;
  top: 0;
  z-index: 2;
  translate: -50% 0;
  filter: drop-shadow(0 12px 18px rgb(0 0 0 / 0.5));
  transition: transform var(--dur-slow) var(--ease-spring);
}
.kd-bcard-side {
  bottom: 4%;
  z-index: 1;
  filter: brightness(0.85) drop-shadow(0 8px 12px rgb(0 0 0 / 0.45));
  transition: transform var(--dur-slow) var(--ease-spring);
}
.kd-bcard-side.is-left {
  left: 2%;
  rotate: -8deg;
}
.kd-bcard-side.is-right {
  right: 2%;
  rotate: 8deg;
}
.kd-bcard.is-finished .kd-bcard-hero,
.kd-bcard.is-finished .kd-bcard-side {
  filter: brightness(0.55) saturate(0.6);
}
.kd-bcard-av {
  box-shadow: 0 0 0 3px var(--color-neutral-2);
}
@media (hover: hover) {
  .kd-bcard:hover {
    border-color: var(--color-neutral-6);
  }
  .kd-bcard:hover .kd-bcard-hero {
    transform: translateY(-4px) scale(1.04);
  }
  .kd-bcard:hover .kd-bcard-side.is-left {
    transform: translateX(-4px);
  }
  .kd-bcard:hover .kd-bcard-side.is-right {
    transform: translateX(4px);
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
