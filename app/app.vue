<script setup lang="ts">
const session = useSessionStore()
await callOnce('session', () => session.fetchMe())
</script>

<template>
  <!-- only when a page's code takes long to arrive (a slow network): a tap on a fast one shows nothing extra -->
  <NuxtLoadingIndicator color="var(--color-brand-base)" :height="2" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
