<script setup lang="ts">
// 404 and other errors (the catch-all route and app/error.vue): the running chicken, the code, the way back.
withDefaults(defineProps<{ code?: number; path?: string }>(), { code: 404 })
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col items-center gap-4 px-4 pt-10 pb-24 text-center lg:pt-16">
    <img src="/img/brand/hero-mascot.webp" alt="" class="kd-nf-art w-64 max-w-full lg:w-80" draggable="false" />
    <span class="type-12-caps text-brand-light">{{ code }}<template v-if="path"> · {{ path }}</template></span>
    <h1 class="type-20-caps md:type-28 uppercase">{{ code === 404 ? $t('common.notFound') : $t('common.error') }}</h1>
    <p v-if="code === 404" class="type-14-regular max-w-80 text-neutral-12">{{ $t('common.notFoundText') }}</p>
    <UiButton to="/" icon="cases" size="l">{{ $t('common.backHome') }}</UiButton>
  </div>
</template>

<style scoped>
/* it runs off with the page */
.kd-nf-art {
  filter: drop-shadow(0 16px 20px rgb(0 0 0 / 0.55));
  animation: kd-nf-run 1.4s var(--ease-sine) infinite;
}
@keyframes kd-nf-run {
  50% {
    transform: translateY(-8px) rotate(-2deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-nf-art {
    animation: none;
  }
}
</style>
