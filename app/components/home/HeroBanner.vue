<script setup lang="ts">
import type { StageLayer, StageLoot } from '~/components/banner/Stage.vue'

// Figma "HeroBanner": desktop = text left, art right (1232×324, padding 32/40/40);
// mobile variant = art on top, text and actions below.
//
// Two voices. A guest gets the pitch ("stop getting scammed") and Start playing (sign in). A signed-in player gets
// greeted by name and the one thing worth doing now: the welcome cases still free, else the daily case if it is
// ready, else the fresh picks below.
// The art is a BannerStage: the chicken (drawn after the logo) bursts out of an open case — the case's back, the
// chicken, the case's front wall — with real catalog skins and KD coins flying around. The fifth poke lays a golden
// egg — an honest one: it offers the free demo spin every case has.
// `bare`: no ground, no frame and no side padding — the full-width band around it (HomeHeroBleed) paints the light;
// the words line up with the page's column, centred in a banner tall enough for big art. The `art` slot replaces the chicken's stage
// and gets the pokes (poke, bubble, pokes) so the same bubble and golden egg go on; the `aside` slot sits on the
// buttons' line, at its right end (desktop).
const session = useSessionStore()
const ui = useUiStore()
const { dailyReady, welcomeLeft } = useBonuses()
defineProps<{ bare?: boolean }>()
const emit = defineEmits<{ start: [] }>()

// what the signed-in player is offered, most valuable first
const offer = computed(() => {
  if (!session.user) return null
  if (welcomeLeft.value > 0) return { title: 'hero.freeTitle', n: welcomeLeft.value, cta: 'hero.freeCta', icon: 'bonuses', to: '/bonuses' }
  if (dailyReady.value) return { title: 'hero.dailyTitle', n: 0, cta: 'hero.dailyCta', icon: 'bonuses', to: '/bonuses' }
  return { title: 'hero.picksTitle', n: 0, cta: 'hero.picksCta', icon: 'cases', to: '' }
})
function start() {
  if (!session.user) ui.openSignIn()
  else emit('start')
}

const { onMove, onLeave, vars } = usePointerTilt()
const stage = useTemplateRef<{ burst: () => void }>('stage')

const BACK: StageLayer[] = [{ src: '/img/hero/case-back.webp', x: 200, y: 76, w: 330, d: 0.3 }]
const CHICKEN: StageLayer = { src: '/img/hero/chicken.webp', x: 212, y: -6, w: 300, d: 0.6 }
const FRONT: StageLayer[] = [{ src: '/img/hero/case-front.webp', x: 200, y: 76, w: 330, d: 0.3 }]
// real catalog skins, so the hero shows what the site pays out; then KD coins
const LOOT: StageLoot[] = [
  { src: '/img/items/cs2/butterfly-knife-fade.webp', x: 70, y: 70, w: 150, r: -24, d: 1.4, bx: -28, by: -18 },
  { src: '/img/items/cs2/awp-dragon-lore.webp', x: 400, y: 26, w: 210, r: 16, d: 1.1, bx: 26, by: -22 },
  { src: '/img/items/cs2/sport-gloves-pandora-s-box.webp', x: 40, y: 230, w: 140, r: -10, d: 1.6, bx: -32, by: 10 },
  { src: '/img/items/cs2/ak-47-wild-lotus.webp', x: 440, y: 190, w: 180, r: -12, d: 1.3, bx: 30, by: 8 },
  { src: '/img/items/cs2/m4a4-howl.webp', x: 190, y: 0, w: 150, r: 8, d: 0.8, bx: -10, by: -30 },
  { src: '/img/coins/coin.webp', x: 170, y: 150, w: 44, r: -30, d: 1.8, bx: -20, by: -14 },
  { src: '/img/coins/coin.webp', x: 520, y: 120, w: 36, r: -7, d: 2, bx: 22, by: -10 },
  { src: '/img/coins/coin.webp', x: 140, y: 330, w: 52, r: 16, d: 2.2, bx: -24, by: 12 },
  { src: '/img/coins/coin.webp', x: 560, y: 320, w: 40, r: 39, d: 1.7, bx: 22, by: 14 },
]

const PECKS = 5
const pecks = ref(0)
const egg = ref(false)
function onPoke() {
  if (egg.value) return
  pecks.value += 1
  if (pecks.value >= PECKS) {
    egg.value = true
    stage.value?.burst()
  }
}
function closeEgg() {
  egg.value = false
  pecks.value = 0
}
const bubble = computed(() => (egg.value ? '' : `hero.poke${Math.min(pecks.value, PECKS - 1)}`))
</script>

<template>
  <section
    class="kd-hero relative isolate flex flex-col p-4 sm:min-h-60 sm:flex-row sm:py-6 lg:gap-6 lg:py-10"
    :class="bare ? 'overflow-visible sm:px-4 lg:min-h-[440px] xl:px-0' : 'overflow-hidden rounded-4xl sm:rounded-5xl sm:px-8 lg:h-80 lg:overflow-visible lg:rounded-[32px] lg:px-10'"
    :style="vars"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <!-- the ground: the site's near-black, lit from the open case on the right -->
    <span v-if="!bare" class="kd-hero-ground pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" aria-hidden="true" />

    <!-- The stage. Phones: a band above the text; wider: the right side, rising over the banner's top -->
    <div class="relative -mx-4 -mt-4 mb-2 h-44 sm:absolute sm:inset-y-0 sm:right-0 sm:m-0 sm:h-auto sm:w-[52%] lg:w-[620px]">
      <slot name="art" :poke="onPoke" :bubble="bubble ? $t(bubble) : ''" :pokes="pecks" />
      <BannerStage
        v-if="!$slots.art"
        ref="stage"
        :back="BACK"
        :mascot="CHICKEN"
        :front="FRONT"
        :loot="LOOT"
        :bubble="bubble ? $t(bubble) : ''"
        :poke-label="$t('hero.pokeLabel')"
        @poke="onPoke"
      />
    </div>

    <div class="relative z-10 flex flex-col justify-between gap-4 sm:max-w-[58%] sm:gap-6 lg:gap-10 lg:h-full lg:max-w-none" :class="bare ? 'lg:w-[600px] lg:justify-center' : 'lg:w-[709px] lg:justify-center'">
      <div class="flex flex-col gap-1 sm:gap-2">
        <p class="type-12-caps lg:type-16-caps text-brand-light">
          {{ session.user ? $t('hero.back', { name: session.user.nickname }) : $t('hero.eyebrow') }}
        </p>
        <h1
          class="font-extrabold uppercase"
          :class="bare ? 'text-[28px] leading-8 sm:text-[36px] sm:leading-10 lg:text-[54px] lg:leading-[56px] lg:tracking-[-0.01em]' : 'text-xl leading-6 sm:text-[32px] sm:leading-9 lg:type-48-caps'"
        >
          {{ offer ? $t(offer.title, { n: offer.n }, offer.n || 1) : $t('hero.title') }}
        </h1>
      </div>
      <!-- the buttons' line runs the banner's whole width when something sits on it under the art; only its contents
           take the pointer, so the art behind the empty middle stays clickable -->
      <div class="flex items-center gap-2" :class="$slots.aside && 'pointer-events-none lg:w-[calc(100vw-32px)] xl:w-[1232px] [&>*]:pointer-events-auto'">
        <UiButton v-if="!offer" size="l" class="max-sm:h-10 max-sm:px-4" @click="start">{{ $t('hero.cta') }}</UiButton>
        <UiButton v-else-if="offer.to" size="l" :icon="offer.icon" :to="offer.to" class="max-sm:h-10 max-sm:px-4">{{ $t(offer.cta) }}</UiButton>
        <UiButton v-else size="l" :icon="offer.icon" class="max-sm:h-10 max-sm:px-4" @click="start">{{ $t(offer.cta) }}</UiButton>
        <UiButton variant="ghost" size="l" icon="info" to="/fairness" class="max-sm:h-10 max-sm:px-3">{{ $t('hero.howItWorks') }}</UiButton>
        <div v-if="$slots.aside" class="ml-auto hidden lg:flex"><slot name="aside" /></div>
      </div>
    </div>

    <!-- the fifth poke: a golden egg, and the free demo spin it stands for -->
    <Transition name="kd-egg">
      <div v-if="egg" class="kd-hero-egg absolute top-3 right-3 z-20 grid w-[280px] grid-cols-[56px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-3xl p-4 sm:top-auto sm:right-6 sm:bottom-6 lg:right-10 lg:bottom-10">
        <span class="kd-hero-egg-icon grid size-14 place-items-center rounded-2xl"><UiIcon name="egg" :size="30" /></span>
        <div class="flex min-w-0 flex-col gap-0.5 pr-5">
          <span class="type-16-caps text-gold-light">{{ $t('hero.eggTitle') }}</span>
          <span class="type-12-regular text-neutral-13">{{ $t('hero.eggText') }}</span>
        </div>
        <UiButton size="m" icon="demo" to="/case/kurwa-classic?demo=1" class="col-span-2 w-full">{{ $t('hero.eggCta') }}</UiButton>
        <button type="button" class="kd-hit absolute top-3 right-3 text-neutral-11 hover:text-neutral-15" :aria-label="$t('hero.eggClose')" @click="closeEgg">
          <UiIcon name="close" :size="16" />
        </button>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
/* the ground: near-black, a warm pool of light where the case opens, a vignette */
.kd-hero-ground {
  background:
    radial-gradient(60% 90% at 78% 70%, rgb(255 110 30 / 0.42), transparent 70%),
    radial-gradient(40% 60% at 70% 100%, rgb(255 190 80 / 0.25), transparent 70%),
    linear-gradient(110deg, var(--color-neutral-2) 30%, #2a1209 100%);
}
.kd-hero-egg {
  background:
    radial-gradient(70% 90% at 15% 30%, rgb(245 198 73 / 0.22), transparent 70%),
    rgb(12 13 16 / 0.92);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-gold) 55%, transparent),
    0 12px 32px rgb(0 0 0 / 0.5);
  backdrop-filter: blur(8px);
}
.kd-hero-egg-icon {
  color: #3a2400;
  background: linear-gradient(180deg, #ffe58a, #f5b82e 55%, var(--color-gold-dark));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.5),
    0 0 24px rgb(245 198 73 / 0.45);
}
.kd-egg-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-egg-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-egg-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.92);
}
.kd-egg-leave-to {
  opacity: 0;
}
</style>
