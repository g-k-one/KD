<script setup lang="ts">
// The battle room while its battle loads: the bar, the dock, the arena and the seats' bars in their sizes
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-5 lg:px-0 lg:pt-10" aria-busy="true" :aria-label="$t('common.loading')">
    <div class="flex min-h-10 items-center justify-between gap-2">
      <span class="kd-skeleton h-6 w-20 rounded-md lg:w-36" />
      <span class="kd-skeleton h-6 w-32 rounded-md lg:h-8 lg:w-52" />
      <span class="kd-skeleton h-6 w-20 rounded-md lg:w-36" />
    </div>
    <span class="kd-skeleton h-52 rounded-5xl lg:h-24" />
    <span class="kd-skeleton h-52 rounded-5xl lg:h-[296px]" />
    <div class="grid grid-cols-2 gap-2 md:gap-4">
      <span v-for="n in 2" :key="n" class="kd-skeleton h-[116px] rounded-3xl lg:h-16" />
    </div>
  </div>
</template>
