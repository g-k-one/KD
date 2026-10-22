<script setup lang="ts">
// Unknown routes: the 404 (the same block app/error.vue shows for errors)
const route = useRoute()
useHead({ title: 'KurwaDROP' })
</script>

<template>
  <LayoutNotFound :path="route.path" />
</template>
