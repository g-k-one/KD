<script setup lang="ts">
import type { BigWinsResponse } from '#shared/types/api'
import { FORGE_KEY, type ForgeLayer } from '~/composables/useForge'

// "Big wins today" (player audit D1): the day's best multipliers, so the home page has heat.
// Each win is a wide card: the skin on the left breaks out over the card's top edge, big and tilted, its rarity's
// light spreading from behind it across the card; on the right the place (a gold, silver or bronze medal), the
// multiplier as the headline, the price, the skin and who won it, each on its own line with air between.
// Desktop: #1, #2, #3 in one row, the cards one height, the winner's golden, its multiplier burning.
// Phones: one line that runs by itself — #1, #2, #3 and again, a seamless loop (the three cards twice, the copies hidden
// from screen readers); a finger on it holds it still. With reduced motion it is a plain swipe row.
// Behind each skin a calm fire in its rarity's colour (kdFlame): licks and embers rise slowly from under the skin, on every
// width. Its Forge layer sits between the cards' ground and their skin and text; it burns only on screen.
// The room above the cards is only what the skins break out by. Each card links to where the drop came from.
const { data } = useFetch<BigWinsResponse>('/api/wins/today', { key: 'wins-today', lazy: true, server: false })
// on its way the block keeps its place, so the cases below don't jump down when the wins arrive
const wins = computed(() => (data.value?.wins ?? []).slice(0, 3).map((win, k) => ({ win, rank: k + 1 })))
const isLg = useMediaQuery('(min-width: 1024px)')
// big enough to fill the left half (the picture is 1⅔ × the size): it stands in the card on its shadow and breaks
// out over the top edge by about a quarter
const artSize = () => (isLg.value ? 106 : 62)
// the running line on phones: the three cards, then the same three again for the seamless loop
const rail = computed(() => (isLg.value ? wins.value.map((p) => ({ ...p, copy: false })) : [...wins.value, ...wins.value].map((p, k) => ({ ...p, copy: k >= wins.value.length }))))
const held = ref(false)

// The fire's canvas. Desktop: the home page's (the cards stand still). Phones: the belt's own, a layer inside the moving
// track, so the canvas rides with the cards on the compositor and a flame never has to chase its card (Forge measures
// looping fire only on scroll/resize and twice a second; a flame on a still canvas lagged behind the running belt).
const homeFx = inject(FORGE_KEY, null)
const beltFx = provideForge(useTemplateRef<HTMLElement>('fxBelt'))
const layer = () => (isLg.value && homeFx ? homeFx : beltFx)
provide(FORGE_KEY, {
  play: (...a: Parameters<ForgeLayer['play']>) => layer().play(...a),
  at: (...a: Parameters<ForgeLayer['at']>) => layer().at(...a),
  stopAll: () => (homeFx?.stopAll(), beltFx.stopAll()),
  killAll: () => (homeFx?.killAll(), beltFx.killAll()),
  preload: (atlas?: string) => layer().preload(atlas),
})



</script>

<template>
  <section v-if="!data" class="flex flex-col gap-2 lg:gap-3" aria-hidden="true">
    <div class="flex h-6 items-center gap-2"><span class="kd-skeleton h-5 w-40 rounded-md lg:h-6" /></div>
    <div class="flex gap-3 pt-2 max-lg:-mx-4 max-lg:overflow-hidden max-lg:pl-4 lg:grid lg:grid-cols-3 lg:gap-4 lg:pt-4">
      <span v-for="n in 3" :key="n" class="kd-skeleton h-[122px] rounded-3xl max-lg:w-[296px] max-lg:shrink-0 lg:h-44 lg:rounded-5xl" />
    </div>
  </section>
  <section v-else-if="wins.length" class="flex flex-col gap-2 lg:gap-3">
    <div class="flex items-center gap-2">
      <UiIcon name="fire" :size="20" class="text-brand-light" />
      <h2 class="type-16-caps lg:type-20-caps">{{ $t('wins.title') }}</h2>
      <span class="type-12 ml-auto text-neutral-11">{{ $t('wins.window') }}</span>
    </div>
    <!-- the room above is what the skins break out by, no more -->
    <!-- phones: the line runs edge to edge; it clips sideways only, so the skins still break out over the top -->
    <div
      class="kd-wins-rail relative pt-2 max-lg:-mx-4 lg:pt-4"
      :class="held && 'is-held'"
      @pointerdown="held = true"
      @pointerup="held = false"
      @pointercancel="held = false"
      @pointerleave="held = false"
    >
    <div class="kd-wins-track relative flex gap-3 max-lg:w-max max-lg:pr-3 lg:grid lg:grid-cols-3 lg:gap-4">
      <!-- the fire draws over the cards' ground (z 1), under their skin and text (z 2): on the home page's canvas on desktop,
           on phones on this layer, which runs with the belt and reaches above it for the licks over the skins -->
      <div ref="fxBelt" class="pointer-events-none absolute inset-x-0 -top-12 bottom-0 z-[1] lg:hidden" aria-hidden="true" />
      <NuxtLink
        v-for="(p, i) in rail"
        :key="`${p.win.id}-${p.copy}`"
        :to="sourceLink(p.win.caseSlug)"
        :aria-hidden="p.copy || undefined"
        :tabindex="p.copy ? -1 : undefined"
        class="kd-win kd-press kd-press-wide group relative grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-center gap-2 rounded-3xl py-2.5 pr-4 pl-1 lg:rounded-5xl max-lg:w-[296px] max-lg:shrink-0 lg:grid-cols-[50%_minmax(0,1fr)] lg:gap-2 lg:py-4 lg:pr-5 lg:pl-2"
        :class="p.rank === 1 ? 'is-first' : ''"
        :style="{ '--rc': RARITY_COLOR[p.win.item.rarity], '--i': i % 3 }"
        :data-rank="p.rank"
      >
        <!-- the skin stands on its shadow in the left half and breaks out over the card's top edge -->
        <div class="kd-win-stage relative z-[2] self-stretch">
          <span class="kd-win-shadow absolute" aria-hidden="true" />
          <!-- the fire: its base line on the skin's lower edge, licks rising behind it -->
          <span class="kd-win-fire absolute"><FxFire effect="kdFlame" :color="RARITY_HEX[p.win.item.rarity]" :spread="1.7" class="w-full"><span class="block h-2 w-full" /></FxFire></span>
          <ItemArt :image="p.win.item.image" :rarity="p.win.item.rarity" :size="artSize()" float class="kd-win-art relative w-full" />
        </div>
        <div class="relative z-[2] flex min-w-0 flex-col items-start gap-1 lg:gap-1.5">
          <div class="flex items-center gap-2">
            <span class="kd-win-rank type-12-caps flex h-6 items-center gap-1 rounded-lg px-2" :class="`is-${p.rank}`">
              <UiIcon v-if="p.rank === 1" name="crown" :size="14" />#{{ p.rank }}
            </span>
            <!-- the price as on the case cards: the same coin and figures -->
            <UiPrice :amount="p.win.item.price" size="l" />
          </div>
          <span class="kd-win-x relative z-[2]" :class="p.rank === 1 && 'is-first'">x{{ p.win.multiplier }}</span>
          <!-- phones: the weapon and the skin on one line; desktop: the weapon over the skin -->
          <span class="flex w-full min-w-0 max-lg:items-baseline max-lg:gap-1.5 lg:flex-col">
            <span class="kd-win-weapon type-12-caps shrink-0 truncate">{{ p.win.item.weapon }}</span>
            <span class="type-14 truncate" :style="{ color: 'var(--rc)' }">{{ p.win.item.skin }}</span>
          </span>
          <!-- who, where from, when: words only (the tiny case / upgrade icons read as noise at this size) -->
          <span class="type-12-regular w-full truncate text-neutral-11">{{ p.win.nickname }} · {{ timeAgo(p.win.at) }} · {{ p.win.caseName }}</span>
        </div>
      </NuxtLink>
    </div>
    </div>
  </section>
</template>

<style scoped>
/* the card: lit from the skin — the rarity's light spreads from behind it to the left, over a lifted ground */
.kd-win {
    background:
    linear-gradient(100deg, color-mix(in srgb, var(--rc) 10%, var(--color-neutral-3)), var(--color-neutral-3) 55%, var(--color-neutral-2));
  animation: kd-win-in var(--dur-slow) var(--ease-out) backwards;
  animation-delay: calc(var(--i) * 70ms);
}
.kd-win :deep(.kd-art-glow) {
  display: none;
}
/* the fire sits along the skin's lower edge, the width of the stage */
.kd-win-fire {
  left: 8%;
  right: 8%;
  bottom: 22%;
}
/* the rarity shape stands out from the card's light (same hue, so it needs the contrast) */
.kd-win :deep(.kd-art-star) {
  opacity: 0.75;
}
/* the light brightens on hover and keeps breathing on the winner's card (an ::after, opacity only) */
.kd-win::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: radial-gradient(35% 80% at 25% 42%, color-mix(in srgb, var(--rc) 40%, transparent), transparent 70%);
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-out);
  pointer-events: none;
}
.kd-win.is-first {
  background:
    linear-gradient(100deg, color-mix(in srgb, var(--color-gold) 13%, var(--color-neutral-3)), var(--color-neutral-3) 55%, var(--color-neutral-2));
}
.kd-win.is-first::after {
  animation: kd-glow-pulse 2.6s ease-in-out infinite;
}
@media (min-width: 64rem) {
  /* one row, one height */
  .kd-win {
    min-height: 176px;
  }
}
/* the stage: the skin and its rarity shape sit in the middle of the card's left half */
.kd-win-stage {
  display: grid;
  place-items: center;
}
.kd-win-art {
  transform: rotate(-12deg);
  transition: transform var(--dur-slow) var(--ease-spring);
}
/* a soft contact shadow under the skin: it stands in the card instead of floating in the air */
.kd-win-shadow {
  bottom: -6px;
  left: 50%;
  width: 72%;
  height: 18px;
  translate: -50% 0;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.35), transparent);
}
@media (min-width: 64rem) {
  .kd-win-shadow {
    bottom: -6px;
    height: 24px;
  }
}
@media (hover: hover) {
  .kd-win:hover::after {
    opacity: 1;
  }
  .kd-win:hover .kd-win-art {
    transform: rotate(-4deg) translateY(-6px) scale(1.06);
  }
}
/* the item card's name style (DropCard): the weapon in the weapon grey, the skin in its rarity's colour */
.kd-win-weapon {
  color: var(--color-weapon);
}
/* medals: gold, silver, bronze */
.kd-win-rank {
  color: #2a1d08;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.55),
    0 4px 10px rgb(0 0 0 / 0.35);
}
.kd-win-rank.is-1 {
  background: linear-gradient(180deg, #ffe58a, #f5b82e 55%, var(--color-gold-dark));
}
.kd-win-rank.is-2 {
  color: #1d2230;
  background: linear-gradient(180deg, #f4f7fb, #b9c2d0 55%, #7f8899);
}
.kd-win-rank.is-3 {
  color: #2b1406;
  background: linear-gradient(180deg, #ffc89a, #d9844a 55%, #8f4a22);
}
.kd-win-x {
  font-size: 26px;
  line-height: 30px;
  font-weight: 800;
  letter-spacing: -0.01em;
  background: linear-gradient(180deg, var(--color-gold-light), var(--color-brand-bright) 55%, var(--color-brand-base));
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 8px rgb(var(--brand-rgb) / 0.5));
}
@media (min-width: 64rem) {
  .kd-win-x {
    font-size: 36px;
    line-height: 40px;
  }
  .kd-win-x.is-first {
    font-size: 44px;
    line-height: 48px;
  }
}
/* phones: the running line — the track holds the cards twice and slides by half its width, so it loops without a seam
   (the track's end padding is one gap, so both halves are the same width); a finger holds it */
@media (max-width: 63.999rem) {
  /* the line runs to the screen's very edges: no fade there (on the dark ground a fade read as a bite out of the card) */
  .kd-wins-rail {
    overflow-x: clip;
  }
  .kd-wins-track {
    animation: kd-wins-run 22s linear infinite;
  }
  .kd-wins-rail.is-held .kd-wins-track {
    animation-play-state: paused;
  }
}
/* it starts with the first card on the page's 16 px line (the grid below), not at the screen's edge; the same 16 px at
   both ends keeps the loop seamless */
@keyframes kd-wins-run {
  from {
    transform: translateX(16px);
  }
  to {
    transform: translateX(calc(-50% + 16px));
  }
}
@media (max-width: 63.999rem) and (prefers-reduced-motion: reduce) {
  .kd-wins-rail {
    overflow-x: auto;
    scrollbar-width: none;
  }
  .kd-wins-track {
    animation: none;
    padding-inline: 16px;
  }
}
@keyframes kd-win-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
</style>
