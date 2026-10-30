<script setup lang="ts">
// A battle room. The room loads inside its own Suspense, so a tap from the lobby shows the room's skeleton at once
// instead of holding the lobby until the battle comes in; the first load, rendered on the server, comes complete.
const route = useRoute()
</script>

<template>
  <!-- from room to room (Recreate) the old one holds until the new one is in; the skeleton only if that takes long -->
  <Suspense :timeout="400">
    <PvpRoom :key="String(route.params.id)" />
    <template #fallback><PvpRoomSkeleton /></template>
  </Suspense>
</template>
