<script setup lang="ts">
/*
 * Home banner, full width (variant b, useHeroVariant): the three banners — home, Bonuses, Provably Fair — on one
 * carousel. The one in front sits in the content column; the other two peek in from the screen's sides, smaller and
 * dimmed, and a tap on one brings it forward. With three slides each is always in front, left or right: the one that
 * goes round the back jumps without sliding across and fades in. Arrows at the screen's edges on desktop, a swipe on
 * phones, dots under; it never turns by itself.
 */
const emit = defineEmits<{ start: [] }>()
const SLIDES = ['home', 'bonus', 'fair'] as const
const active = ref(0)
const offset = (i: number) => ((i - active.value + 4) % 3) - 1 // -1 left, 0 in front, 1 right
const go = (i: number) => (active.value = (i + 3) % 3)

// the slide that wraps round (from one side to the other) fades in instead of crossing the screen
const slideEls = useTemplateRef<HTMLElement[]>('slideEls')
const jumping = ref<number | null>(null)
watch(active, (now, before) => {
  const was = (i: number) => ((i - before + 4) % 3) - 1
  const j = SLIDES.findIndex((_, i) => Math.abs(offset(i) - was(i)) > 1)
  jumping.value = j
  slideEls.value?.[j]?.animate([{ opacity: 0 }, { opacity: 0.4 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' })
  requestAnimationFrame(() => requestAnimationFrame(() => (jumping.value = null)))
})

// a swipe (finger or pen; a mouse clicks the arrows): the slides follow the finger, past 48 px it turns
const drag = ref(0)
let from: number | null = null
function down(e: PointerEvent) {
  if (e.pointerType === 'mouse') return
  from = e.clientX
}
function move(e: PointerEvent) {
  if (from !== null) drag.value = e.clientX - from
}
function up() {
  if (from === null) return
  if (Math.abs(drag.value) > 48) go(active.value + (drag.value < 0 ? 1 : -1))
  from = null
  drag.value = 0
}
</script>

<template>
  <section class="kd-carousel relative overflow-x-clip pt-4 pb-6 lg:pt-10 lg:pb-10">
    <div
      class="kd-track mx-auto grid"
      :class="drag !== 0 && 'is-dragging'"
      :style="{ '--drag': `${drag}px` }"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
    >
      <div
        v-for="(s, i) in SLIDES"
        :key="s"
        ref="slideEls"
        class="kd-slide relative"
        :class="{ 'is-side': offset(i) !== 0, 'is-jump': jumping === i }"
        :style="{ '--o': offset(i) }"
      >
        <div :inert="offset(i) !== 0">
          <HomeHeroBanner v-if="s === 'home'" @start="emit('start')" />
          <HomeHeroPoster v-else :kind="s" />
        </div>
        <!-- a peeking slide is one big button that brings it forward -->
        <button v-if="offset(i) !== 0" type="button" class="absolute inset-0 z-30 cursor-pointer" :aria-label="$t('hero.showSlide', { n: i + 1 })" @click="go(i)" />
      </div>
    </div>

    <!-- arrows at the screen's edges, over the peeking slides -->
    <button type="button" class="kd-arrow absolute top-1/2 left-6 z-30 hidden size-12 -translate-y-1/2 place-items-center rounded-full lg:grid" :aria-label="$t('hero.prevSlide')" @click="go(active - 1)">
      <UiIcon name="chevron-left" :size="24" />
    </button>
    <button type="button" class="kd-arrow absolute top-1/2 right-6 z-30 hidden size-12 -translate-y-1/2 place-items-center rounded-full lg:grid" :aria-label="$t('hero.nextSlide')" @click="go(active + 1)">
      <UiIcon name="chevron-right" :size="24" />
    </button>

    <div class="mt-4 flex justify-center gap-2">
      <button
        v-for="(s, i) in SLIDES"
        :key="s"
        type="button"
        class="kd-dot kd-hit relative h-2 w-6 rounded-full"
        :class="i === active && 'is-on'"
        :aria-label="$t('hero.showSlide', { n: i + 1 })"
        :aria-current="i === active"
        @click="go(i)"
      />
    </div>
  </section>
</template>

<style scoped>
/* one column wide: the content column on desktop, the screen less two peeks on phones; every slide in one grid cell,
   so the carousel is as tall as the tallest */
.kd-track {
  --gap: 12px;
  width: min(1232px, calc(100vw - 64px));
  touch-action: pan-y;
}
@media (min-width: 1024px) {
  .kd-track {
    --gap: 24px;
  }
}
.kd-slide {
  grid-area: 1 / 1;
  /* a peeking slide shrinks toward its inner edge, so the strip that shows keeps its width */
  transform-origin: calc(50% - var(--o) * 50%) 50%;
  transform: translate3d(calc(var(--o) * (100% + var(--gap)) + var(--drag, 0px)), 0, 0) scale(1);
  transition:
    transform var(--dur-slow) var(--ease-out),
    opacity var(--dur-slow) var(--ease-out);
}
.kd-slide.is-side {
  opacity: 0.4;
  transform: translate3d(calc(var(--o) * (100% + var(--gap)) + var(--drag, 0px)), 0, 0) scale(0.94);
}
.kd-track.is-dragging .kd-slide,
.kd-slide.is-jump {
  transition: none;
}
.kd-arrow {
  color: var(--color-neutral-15);
  background: rgb(12 13 16 / 0.7);
  box-shadow: inset 0 0 0 1px var(--color-neutral-5);
  backdrop-filter: blur(6px);
  transition: transform var(--dur-fast) var(--ease-out);
}
.kd-arrow:active {
  transform: translateY(-50%) scale(0.96);
}
.kd-dot {
  background: var(--color-neutral-5);
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-dot.is-on {
  background: var(--color-brand-base);
}
</style>
