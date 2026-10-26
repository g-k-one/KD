<script setup lang="ts">
// A drop card while the case loads: the card's paddings, its top row, an art box as tall as ItemArt and the three
// lines in their own type (text transparent), so the grid is as tall as the real one.
defineProps<{ compact?: boolean }>()
</script>

<template>
  <div class="flex min-w-0 flex-col items-center rounded-3xl bg-neutral-2" :class="compact ? 'gap-1.5 p-2.5' : 'gap-2 p-3 lg:p-4'" aria-hidden="true">
    <div class="flex w-full items-center justify-between gap-1" :class="compact ? 'type-10-caps' : 'type-12'">
      <span class="kd-skeleton w-6 rounded-sm text-transparent">&nbsp;</span>
      <span class="kd-skeleton w-9 rounded-sm text-transparent">&nbsp;</span>
    </div>
    <div class="grid w-full place-items-center" :style="{ height: `${compact ? 72 : 96}px` }">
      <span class="kd-skeleton h-[70%] w-[78%] rounded-2xl" />
    </div>
    <div class="flex w-full min-w-0 flex-col items-center gap-1 lg:gap-2">
      <span class="kd-skeleton type-12-caps w-1/2 rounded-sm text-transparent">&nbsp;</span>
      <span class="kd-skeleton type-14 w-3/4 rounded-sm text-transparent">&nbsp;</span>
      <span class="kd-skeleton rounded-sm"><UiPrice :amount="0" class="invisible" /></span>
    </div>
  </div>
</template>
