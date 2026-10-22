<script setup lang="ts">
// Figma "HeroBanner": desktop = text left, art right (1232×324, padding 32/40/40);
// mobile variant = art on top, text and actions below.
const session = useSessionStore()
const ui = useUiStore()
const emit = defineEmits<{ start: [] }>()

function start() {
  if (!session.user) ui.openSignIn()
  else emit('start')
}
</script>

<template>
  <section
    class="kd-hero relative isolate flex flex-col overflow-hidden rounded-4xl lg:overflow-visible p-4 sm:min-h-60 sm:flex-row sm:rounded-5xl sm:px-8 sm:py-6 lg:h-81 lg:gap-6 lg:px-10 lg:pt-8 lg:pb-10"
    style="background-image: linear-gradient(144deg, var(--color-neutral-3) 11%, #652210 75%, #922000 97%)"
  >
    <!-- Mobile: art sits in the flow above the text -->
    <div class="relative -mx-4 -mt-4 mb-2 h-40 overflow-hidden sm:hidden">
      <img src="/img/brand/hero-mascot.webp" alt="" class="absolute -top-2 left-1 h-48 w-auto max-w-none" draggable="false" />
    </div>

    <div class="relative z-10 flex flex-col justify-between gap-4 sm:max-w-[58%] sm:gap-6 lg:h-full lg:w-[709px] lg:max-w-none">
      <div class="flex flex-col gap-1 sm:gap-2">
        <p class="type-12-caps lg:type-16-caps text-brand-light">{{ $t('hero.eyebrow') }}</p>
        <h1 class="text-xl leading-6 font-extrabold uppercase sm:text-[32px] sm:leading-9 lg:type-48-caps">
          {{ $t('hero.title') }}
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <UiButton size="l" class="max-sm:h-10 max-sm:px-4" @click="start">{{ $t('hero.cta') }}</UiButton>
        <UiButton variant="ghost" size="l" icon="info" to="/fairness" class="max-sm:h-10 max-sm:px-3">{{ $t('hero.howItWorks') }}</UiButton>
      </div>
    </div>

    <img
      src="/img/brand/hero-mascot.webp"
      alt=""
      class="kd-hero-art pointer-events-none absolute top-[calc(50%-3.5px)] right-0 hidden h-[115%] w-auto max-w-none -translate-y-1/2 sm:block lg:right-[31px] lg:h-[379px] lg:w-[568px] lg:object-cover"
      draggable="false"
    />
  </section>
</template>

<style scoped>
.kd-hero-art {
  transition: transform var(--dur-slow) var(--ease-out);
}
@media (hover: hover) {
  .kd-hero:hover .kd-hero-art {
    transform: translate(-6px, -4px) rotate(-1.5deg);
  }
}
</style>
