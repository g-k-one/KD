<script setup lang="ts">
// Old links (profile menu, upgrade page) land on the matching profile tab
await navigateTo({ path: '/profile', query: { tab: 'settings' } }, { replace: true })
</script>

<template><div /></template>
