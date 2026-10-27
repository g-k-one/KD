<script setup lang="ts">
import type { Battle } from '#shared/types/api'

// A battle as one picture and one button, like a case card. The stage, lit in the mode's colour, holds everything: the
// battle's dearest case large in the middle (×N when it opens more than once), the mode chip top left (its rule in a
// tooltip), the round top right while it is live, the players as a stack of avatars bottom left (+ on a free seat, VS
// between the teams) and the other cases small bottom right. The button says what to do: Join with the seat's price,
// Watch, or View. Nothing says the same thing twice (no pot beside the price, no seat count beside the seats).
// Compact: the same card for a phone's two columns.
const props = defineProps<{ battle: Battle; compact?: boolean }>()
const now = useClock(1000)
const { onPointerMove } = useSpotlight()
const { t } = useI18n()

// every case once, with how many rounds open it; the dearest is the picture, the rest go on the strip
const cases = computed(() => {
  const by = new Map<string, { slug: string; name: string; image: string; price: number; qty: number }>()
  for (const r of props.battle.rounds) {
    const c = by.get(r.slug)
    if (c) c.qty += 1
    else by.set(r.slug, { ...r, qty: 1 })
  }
  return [...by.values()]
})
const hero = computed(() => cases.value.reduce((a, b) => (b.price > a.price ? b : a)))
const rest = computed(() => cases.value.filter((c) => c !== hero.value))
const strip = computed(() => rest.value.slice(0, props.compact ? 1 : 3))
const stripMore = computed(() => rest.value.length - strip.value.length)

const clock = computed(() => battleClock(props.battle, now.value))
const round = computed(() => Math.min(props.battle.rounds.length, Math.max(1, clock.value.round + 1)))
// the seats as one stack, or two with VS between in team mode
const sides = computed(() => (props.battle.mode === 'team' ? [props.battle.slots.slice(0, 2), props.battle.slots.slice(2)] : [props.battle.slots]))
const action = computed(() => ({ waiting: 'pvp.join', live: 'pvp.watch', finished: 'pvp.view' })[props.battle.status])
const modeTip = computed(() => t(`pvp.modeTip.${props.battle.mode}`))
// C's deck: up to five cases with the dearest in the middle, the rest counted
const deck = computed(() => {
  const others = rest.value.slice(0, props.compact ? 2 : 4)
  const half = Math.ceil(others.length / 2)
  return [...others.slice(0, half), hero.value, ...others.slice(half)]
})
const deckMid = computed(() => deck.value.indexOf(hero.value))
const deckMore = computed(() => cases.value.length - deck.value.length)
// three layouts to choose from (debug page, or ?card=a|b|c): a — the stage, b — open, c — versus
const variant = usePvpCardVariant()
</script>

<template>
  <NuxtLink
    :to="`/pvp/${battle.id}`"
    class="kd-bcard kd-spotlight group relative flex min-w-0 flex-col gap-2 rounded-5xl border p-2"
    :class="[`is-${battle.mode}`, battle.status === 'finished' && 'is-finished']"
    @pointermove="onPointerMove"
  >
    <template v-if="variant === 'a'">
    <!-- the stage: 8 px in from the card's 24 px corners, so 16 -->
    <div class="kd-bcard-stage relative grid place-items-center rounded-3xl" :class="compact ? 'h-40' : 'h-56'">
      <span class="relative" :class="compact ? '-translate-y-2' : '-translate-y-3'">
        <img :src="hero.image" :alt="hero.name" draggable="false" class="kd-bcard-hero object-contain" :class="compact ? 'size-28' : 'size-40'" />
        <span v-if="hero.qty > 1" class="type-12 absolute right-0 bottom-1 rounded-md bg-neutral-1/80 px-1.5 py-0.5 text-neutral-14 tabular-nums">×{{ hero.qty }}</span>
      </span>

      <!-- top: the mode, and the round while it is live -->
      <span class="absolute top-2 left-2 z-[3]">
        <UiTooltip :text="modeTip">
          <span class="kd-mode grid size-8 place-items-center rounded-lg" :aria-label="modeTip">
            <UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="18" />
          </span>
        </UiTooltip>
      </span>
      <span v-if="battle.status === 'live'" class="kd-bcard-pill type-12-caps absolute top-2 right-2 flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-danger tabular-nums">
        <span class="kd-live-dot size-1.5 rounded-full bg-danger" />{{ $t('pvp.live') }} {{ round }}/{{ battle.rounds.length }}
      </span>

      <!-- bottom: the players, and the other cases -->
      <div class="absolute inset-x-2 bottom-2 flex items-end justify-between gap-1">
        <div class="kd-bcard-pill flex h-8 min-w-0 items-center gap-1 rounded-lg px-1.5" :class="compact ? 'h-7' : 'h-8'">
          <template v-for="(side, k) in sides" :key="k">
            <span v-if="k > 0" class="type-10-caps px-0.5 text-neutral-11">{{ $t('pvp.vs') }}</span>
            <span class="flex items-center">
              <template v-for="s in side" :key="s.slot">
                <span v-if="s.player" class="kd-bcard-av -ml-1 overflow-hidden rounded-full bg-neutral-7 first:ml-0" :class="compact ? 'size-5' : 'size-6'" :title="s.player.nickname">
                  <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
                </span>
                <span v-else class="kd-bcard-av -ml-1 grid place-items-center rounded-full border border-dashed border-neutral-8 bg-neutral-2 text-neutral-11 first:ml-0" :class="compact ? 'size-5' : 'size-6'">
                  <UiIcon name="plus" :size="10" />
                </span>
              </template>
            </span>
          </template>
        </div>
        <div v-if="strip.length" class="flex shrink-0 items-center gap-1">
          <span v-for="c in strip" :key="c.slug" class="kd-bcard-pill grid place-items-center rounded-lg" :class="compact ? 'size-7' : 'size-8'" :title="c.qty > 1 ? `${c.name} ×${c.qty}` : c.name">
            <img :src="c.image" alt="" draggable="false" class="size-[90%] object-contain" />
          </span>
          <span v-if="stripMore" class="kd-bcard-pill type-12 grid place-items-center rounded-lg text-neutral-13 tabular-nums" :class="compact ? 'size-7' : 'size-8'">+{{ stripMore }}</span>
        </div>
      </div>
    </div>

    <!-- the action, its 8 px corners 16 px in from the card's 24 -->
    <div class="px-2 pb-2">
      <span class="kd-btn type-12-caps inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg" :class="battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary'">
        {{ $t(action) }}
        <span v-if="battle.status === 'waiting'" class="btn-value"><UiPrice :amount="battle.cost" size="s" tone="inverse" /></span>
      </span>
    </div>
    </template>

    <!-- B, open: no box round the case — it floats big on the mode's light, the mode top left, the other cases top right;
         one line under it: the players and the button -->
    <template v-else-if="variant === 'b'">
      <div class="kd-bcard-glow relative grid place-items-center" :class="compact ? 'h-36' : 'h-52'">
        <span class="relative">
          <img :src="hero.image" :alt="hero.name" draggable="false" class="kd-bcard-hero object-contain" :class="compact ? 'size-28' : 'size-44'" />
          <span v-if="hero.qty > 1" class="type-12 absolute right-0 bottom-2 rounded-md bg-neutral-1/80 px-1.5 py-0.5 text-neutral-14 tabular-nums">×{{ hero.qty }}</span>
        </span>
        <span class="absolute top-2 left-2 z-[3]">
          <UiTooltip :text="modeTip">
            <span class="kd-mode grid size-8 place-items-center rounded-lg" :aria-label="modeTip"><UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="18" /></span>
          </UiTooltip>
        </span>
        <div v-if="strip.length" class="absolute top-2 right-2 flex flex-col items-center gap-1">
          <span v-for="c in strip" :key="c.slug" class="grid place-items-center rounded-lg bg-neutral-3" :class="compact ? 'size-7' : 'size-9'" :title="c.qty > 1 ? `${c.name} ×${c.qty}` : c.name">
            <img :src="c.image" alt="" draggable="false" class="size-[90%] object-contain" />
          </span>
          <span v-if="stripMore" class="type-12 grid place-items-center rounded-lg bg-neutral-3 text-neutral-13 tabular-nums" :class="compact ? 'size-7' : 'size-9'">+{{ stripMore }}</span>
        </div>
        <span v-if="battle.status === 'live'" class="kd-bcard-pill type-12-caps absolute bottom-1 left-1/2 flex h-7 -translate-x-1/2 items-center gap-1.5 rounded-lg px-2.5 text-danger tabular-nums">
          <span class="kd-live-dot size-1.5 rounded-full bg-danger" />{{ $t('pvp.live') }} {{ round }}/{{ battle.rounds.length }}
        </span>
      </div>
      <div class="flex items-center gap-2 px-2 pb-2" :class="compact && 'flex-col items-stretch'">
        <div class="flex min-w-0 flex-1 items-center gap-1" :class="compact && 'justify-center'">
          <template v-for="(side, k) in sides" :key="k">
            <span v-if="k > 0" class="type-10-caps px-0.5 text-neutral-10">{{ $t('pvp.vs') }}</span>
            <span class="flex items-center">
              <template v-for="s in side" :key="s.slot">
                <span v-if="s.player" class="kd-bcard-av -ml-1.5 overflow-hidden rounded-full bg-neutral-7 first:ml-0" :class="compact ? 'size-6' : 'size-8'" :title="s.player.nickname">
                  <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
                </span>
                <span v-else class="kd-bcard-av -ml-1.5 grid place-items-center rounded-full border border-dashed border-neutral-8 bg-neutral-2 text-neutral-11 first:ml-0" :class="compact ? 'size-6' : 'size-8'"><UiIcon name="plus" :size="12" /></span>
              </template>
            </span>
          </template>
        </div>
        <span class="kd-btn type-12-caps inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg px-3" :class="battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary'">
          {{ $t(action) }}
          <span v-if="battle.status === 'waiting'" class="btn-value"><UiPrice :amount="battle.cost" size="s" tone="inverse" /></span>
        </span>
      </div>
    </template>

    <!-- C, versus: the players are the picture — big seats across the stage (VS between the teams), the cases as a deck
         fanned flat under them, the mode named with its icon; the button -->
    <template v-else>
      <div class="kd-bcard-stage relative flex flex-col items-center justify-center gap-3 rounded-3xl px-3" :class="compact ? 'min-h-40 pt-10 pb-3' : 'min-h-56 pt-11 pb-4'">
        <span class="absolute top-2 left-2 z-[3]">
          <UiTooltip :text="modeTip">
            <span class="flex items-center gap-2" :aria-label="modeTip">
              <span class="kd-mode grid size-8 place-items-center rounded-lg"><UiIcon :name="PVP_MODE_ICON[battle.mode]" :size="18" /></span>
              <span class="type-12-caps text-neutral-13" :class="compact && 'max-sm:hidden'">{{ $t(`pvp.modeName.${battle.mode}`) }}</span>
            </span>
          </UiTooltip>
        </span>
        <span v-if="battle.status === 'live'" class="kd-bcard-pill type-12-caps absolute top-2 right-2 flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-danger tabular-nums">
          <span class="kd-live-dot size-1.5 rounded-full bg-danger" />{{ $t('pvp.live') }} {{ round }}/{{ battle.rounds.length }}
        </span>
        <!-- the seats, big -->
        <div class="flex items-center justify-center" :class="compact ? 'gap-1' : 'gap-2'">
          <template v-for="(side, k) in sides" :key="k">
            <span v-if="k > 0" class="type-12-caps px-1 text-neutral-11">{{ $t('pvp.vs') }}</span>
            <template v-for="s in side" :key="s.slot">
              <span v-if="s.player" class="kd-bcard-av overflow-hidden rounded-full bg-neutral-7" :class="compact ? 'size-8' : 'size-12'" :title="s.player.nickname">
                <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
              </span>
              <span v-else class="grid place-items-center rounded-full border-2 border-dashed border-neutral-7 text-neutral-11" :class="compact ? 'size-8' : 'size-12'"><UiIcon name="plus" :size="compact ? 14 : 18" /></span>
            </template>
          </template>
        </div>
        <!-- the cases, a deck fanned flat: the dearest on top in the middle -->
        <div class="flex items-center justify-center">
          <img
            v-for="(c, i) in deck"
            :key="c.slug"
            :src="c.image"
            :alt="c.name"
            :title="c.qty > 1 ? `${c.name} ×${c.qty}` : c.name"
            draggable="false"
            class="kd-bcard-hero relative object-contain first:ml-0"
            :class="[compact ? '-ml-5 size-14' : '-ml-7 size-20', c === hero && 'scale-125']"
            :style="{ zIndex: c === hero ? 3 : 2 - Math.abs(i - deckMid) }"
          />
          <span v-if="deckMore" class="type-12 relative z-[4] ml-1 rounded-md bg-neutral-1/80 px-1.5 py-0.5 text-neutral-13 tabular-nums">+{{ deckMore }}</span>
        </div>
      </div>
      <div class="px-2 pb-2">
        <span class="kd-btn type-12-caps inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg" :class="battle.status === 'waiting' ? 'kd-btn-primary' : 'kd-btn-secondary'">
          {{ $t(action) }}
          <span v-if="battle.status === 'waiting'" class="btn-value"><UiPrice :amount="battle.cost" size="s" tone="inverse" /></span>
        </span>
      </div>
    </template>
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
  background: color-mix(in srgb, var(--mc) 22%, rgb(12 13 16 / 0.72));
}
/* the stage: lit from the middle in the mode's colour, dark at the edges */
.kd-bcard-stage {
  background:
    radial-gradient(closest-side, color-mix(in srgb, var(--mc) 32%, transparent), transparent),
    var(--color-neutral-3);
}
.kd-bcard.is-finished .kd-bcard-stage {
  background: var(--color-neutral-3);
}
.kd-bcard-hero {
  filter: drop-shadow(0 12px 18px rgb(0 0 0 / 0.5));
  transition: transform var(--dur-slow) var(--ease-spring);
}
.kd-bcard.is-finished .kd-bcard-hero {
  filter: brightness(0.6) saturate(0.6);
}
/* B: the mode's light straight on the card, no box */
.kd-bcard-glow {
  background: radial-gradient(closest-side, color-mix(in srgb, var(--mc) 30%, transparent), transparent);
}
/* the glass under the corner bits, so they read over the light */
.kd-bcard-pill {
  background: rgb(12 13 16 / 0.72);
}
.kd-bcard-av {
  box-shadow: 0 0 0 1.5px rgb(12 13 16);
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
