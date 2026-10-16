<script setup lang="ts">
const session = useSessionStore()
await callOnce('session', () => session.fetchMe())
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
