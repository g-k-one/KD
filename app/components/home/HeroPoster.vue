<script setup lang="ts">
import type { StageLayer, StageLoot } from '~/components/banner/Stage.vue'

// A home carousel slide for another page (variant b, useHeroVariant): that page's banner in short — its art on a
// BannerStage, one line of what it is, one button there. Laid out like the home hero, so the slides are one height.
const props = defineProps<{ kind: 'bonus' | 'fair' }>()
const { onMove, onLeave, vars } = usePointerTilt()
const pokes = ref(0)
const stage = useTemplateRef<{ burst: () => void }>('stage')
function onPoke(n: number) {
  pokes.value = Math.min(n, 5)
  if (n === 5) stage.value?.burst()
}

const coin = (x: number, y: number, w: number, r: number, d: number): StageLoot => ({ src: '/img/coins/coin.webp', x, y, w, r, d, bx: x < 300 ? -20 : 20, by: y < 200 ? -12 : 12 })
const SLIDES = {
  bonus: {
    eyebrow: 'bonus.title',
    title: 'hero.slideBonusTitle',
    text: 'bonus.dailyText',
    cta: 'hero.slideBonusCta',
    icon: 'bonuses',
    to: '/bonuses',
    variant: 'primary' as const,
    poke: 'bonus',
    back: [] as StageLayer[],
    mascot: { src: '/img/hero/bonus-chicken.webp', x: 250, y: 20, w: 290, d: 0.6 },
    loot: [
      { src: '/img/items/cs2/butterfly-knife-doppler.webp', x: 40, y: 40, w: 170, r: -18, d: 1.3, bx: -28, by: -16 },
      { src: '/img/items/cs2/ak-47-gold-arabesque.webp', x: 10, y: 220, w: 150, r: 12, d: 1.6, bx: -30, by: 12 },
      { src: '/img/items/cs2/desert-eagle-blaze.webp', x: 470, y: 250, w: 140, r: -10, d: 1.4, bx: 28, by: 12 },
      { src: '/img/hero/bonus-gift.webp', x: 180, y: 290, w: 84, r: -12, d: 1.8, bx: -18, by: 14 },
      { src: '/img/hero/bonus-gift.webp', x: 520, y: 40, w: 64, r: 16, d: 2, bx: 20, by: -14 },
      coin(200, 150, 44, -24, 1.9),
      coin(560, 180, 36, 20, 2.1),
    ] as StageLoot[],
    bubbleAt: { x: 470, y: 10 },
  },
  fair: {
    eyebrow: 'fair.eyebrow',
    title: 'fair.heroTitle',
    text: 'fair.heroText1',
    cta: 'hero.slideFairCta',
    icon: 'shield-check',
    to: '/fairness',
    variant: 'fair' as const,
    poke: 'fair',
    back: [{ src: '/img/hero/pf-case.webp', x: 20, y: 96, w: 340, d: 0.3 }] as StageLayer[],
    mascot: { src: '/img/hero/pf-chicken.webp', x: 322, y: 104, w: 260, d: 0.6 },
    loot: [coin(300, 300, 44, -20, 1.9), coin(560, 150, 36, 25, 2.1), coin(60, 40, 40, 16, 1.7)] as StageLoot[],
    bubbleAt: { x: 470, y: 80 },
  },
}
const s = computed(() => SLIDES[props.kind])
const bubble = computed(() => `${s.value.poke}.${pokes.value >= 5 ? 'pokeDone' : `poke${pokes.value}`}`)
</script>

<template>
  <section
    class="relative isolate flex flex-col overflow-hidden rounded-4xl p-4 sm:min-h-60 sm:flex-row sm:rounded-5xl sm:px-8 sm:py-6 lg:h-80 lg:gap-6 lg:overflow-visible lg:rounded-[32px] lg:p-10"
    :style="vars"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <span class="kd-poster-ground pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" :class="`is-${kind}`" aria-hidden="true" />
    <div class="relative -mx-4 -mt-4 mb-2 h-44 sm:absolute sm:inset-y-0 sm:right-0 sm:m-0 sm:h-auto sm:w-[52%] lg:w-[620px]">
      <BannerStage
        ref="stage"
        :back="s.back"
        :mascot="s.mascot"
        :loot="s.loot"
        :bubble="$t(bubble)"
        :bubble-at="s.bubbleAt"
        :poke-label="$t(`${s.poke}.pokeLabel`)"
        @poke="onPoke"
      />
    </div>
    <div class="relative z-10 flex flex-col justify-between gap-4 sm:max-w-[58%] sm:gap-6 lg:h-full lg:w-[640px] lg:max-w-none lg:justify-center lg:gap-8">
      <div class="flex flex-col gap-1 sm:gap-2">
        <p class="type-12-caps lg:type-16-caps" :class="kind === 'bonus' ? 'text-coin' : 'text-success'">{{ $t(s.eyebrow) }}</p>
        <h2 class="text-xl leading-6 font-extrabold uppercase sm:text-[32px] sm:leading-9 lg:type-48-caps">{{ $t(s.title) }}</h2>
        <p class="type-14-regular hidden text-neutral-13 sm:block lg:type-16-medium">{{ $t(s.text) }}</p>
      </div>
      <UiButton :variant="s.variant" size="l" :icon="s.icon" :to="s.to" class="w-max max-sm:h-10 max-sm:px-4">{{ $t(s.cta) }}</UiButton>
    </div>
  </section>
</template>

<style scoped>
/* the grounds of the pages they lead to: gold where the gift opens, green where the glass case stands */
.kd-poster-ground.is-bonus {
  background:
    radial-gradient(55% 90% at 74% 55%, rgb(255 170 40 / 0.34), transparent 70%),
    radial-gradient(40% 60% at 66% 100%, rgb(255 210 110 / 0.2), transparent 70%),
    linear-gradient(110deg, var(--color-neutral-2) 30%, #2a1d07 100%);
}
.kd-poster-ground.is-fair {
  background:
    radial-gradient(55% 90% at 72% 70%, rgb(40 200 110 / 0.32), transparent 70%),
    radial-gradient(40% 60% at 66% 100%, rgb(120 255 170 / 0.18), transparent 70%),
    linear-gradient(110deg, var(--color-neutral-2) 30%, #0a2a17 100%);
}
</style>
