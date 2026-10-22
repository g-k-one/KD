<script setup lang="ts">
import type { NuxtError } from '#app'

// Errors (an unknown case, a broken link) keep the site around them: header, live feed, nav
// `url` is set at runtime but missing from the NuxtError type
const props = defineProps<{ error: NuxtError & { url?: string } }>()
useHead({ title: 'KurwaDROP' })
// error.vue renders instead of app.vue, so the session is loaded here too (or the header shows "Sign in")
const session = useSessionStore()
await callOnce('session', () => session.fetchMe())
</script>

<template>
  <NuxtLayout>
    <LayoutNotFound :code="props.error.statusCode" :path="props.error.url" />
  </NuxtLayout>
</template>
