<script setup lang="ts">
// Placeholder for routes that are designed but not built yet (upgrade, pvp, case page, …).
const route = useRoute()
useHead({ title: 'KurwaDROP' })
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col items-center gap-4 px-4 py-24 text-center">
    <span class="type-12-caps text-brand-light">{{ route.path }}</span>
    <h1 class="type-20-caps">{{ $t('common.comingSoon') }}</h1>
    <p class="type-14-regular text-neutral-12">{{ $t('common.comingSoonText') }}</p>
    <UiButton to="/" variant="secondary">{{ $t('common.backHome') }}</UiButton>
  </div>
</template>
