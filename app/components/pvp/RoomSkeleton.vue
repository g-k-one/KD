<script setup lang="ts">
// The battle room while its battle loads: the bar, the dock, the arena and the seats' bars in their sizes
</script>

<template>
  <div class="kd-page kd-page-top gap-4 lg:gap-6" aria-busy="true" :aria-label="$t('common.loading')">
    <div class="flex min-h-10 items-center justify-between gap-2 lg:-mb-2">
      <span class="kd-skeleton h-6 w-20 rounded-md lg:w-36" />
      <span class="kd-skeleton h-6 w-32 rounded-md lg:h-8 lg:w-52" />
      <span class="kd-skeleton h-6 w-20 rounded-md lg:w-36" />
    </div>
    <span class="kd-skeleton h-36 rounded-3xl lg:h-20" />
    <span class="kd-skeleton h-52 rounded-5xl lg:h-[296px]" />
    <div class="grid grid-cols-2 gap-2 max-lg:-mt-1 md:gap-4">
      <span v-for="n in 2" :key="n" class="kd-skeleton h-[134px] rounded-2xl lg:h-[88px] lg:rounded-5xl" />
    </div>
  </div>
</template>
