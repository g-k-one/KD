<script setup lang="ts">
// Old links (profile menu, upgrade page) land on the matching profile tab
await navigateTo({ path: '/profile', query: { tab: 'inventory' } }, { replace: true })
</script>

<template><div /></template>
