<script setup lang="ts">
withDefaults(defineProps<{ size?: number; inverse?: boolean }>(), { size: 16 })
</script>

<template>
  <img
    :src="inverse ? '/img/brand/coin-inverse.svg' : '/img/brand/coin.svg'"
    :width="size"
    :height="size"
    alt=""
    class="shrink-0"
    draggable="false"
  />
</template>
