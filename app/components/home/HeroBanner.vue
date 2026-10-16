<script setup lang="ts">
const session = useSessionStore()
const emit = defineEmits<{ start: [] }>()

async function start() {
  if (!session.user) await session.login()
  emit('start')
}
</script>

<template>
  <section
    class="relative isolate flex min-h-72 overflow-hidden sm:min-h-60 rounded-5xl px-5 pt-6 pb-5 lg:h-81 lg:px-10 lg:pt-8 lg:pb-10"
    style="background-image: linear-gradient(144deg, var(--color-neutral-3) 11%, #652210 75%, #922000 97%)"
  >
    <div class="relative z-10 flex flex-col justify-between gap-6 sm:max-w-[58%] lg:max-w-[60%]">
      <div class="flex max-w-[78%] flex-col gap-2 sm:max-w-none">
        <p class="type-12-caps lg:type-16-caps text-brand-light">{{ $t('hero.eyebrow') }}</p>
        <h1 class="text-[22px] leading-6.5 font-extrabold uppercase sm:text-[32px] sm:leading-9 lg:type-48-caps">
          {{ $t('hero.title') }}
        </h1>
      </div>
      <div class="mt-auto flex flex-wrap items-center gap-2">
        <UiButton size="l" @click="start">{{ $t('hero.cta') }}</UiButton>
        <UiButton size="l" variant="ghost" icon="info" to="/fairness" class="hidden sm:inline-flex">{{ $t('hero.howItWorks') }}</UiButton>
      </div>
    </div>
    <img
      src="/img/brand/hero-mascot.png"
      alt=""
      class="pointer-events-none absolute -right-14 -bottom-6 h-44 w-auto max-w-none object-contain sm:-right-6 sm:h-56 lg:top-1/2 lg:right-8 lg:bottom-auto lg:h-[379px] lg:-translate-y-1/2"
      draggable="false"
    />
  </section>
</template>
