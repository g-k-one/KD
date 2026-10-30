<script setup lang="ts">
// The case page while its case loads: the bar, the odds strip, the reel, the dock, the hook and the contents grid in
// their own sizes, so the page doesn't jump when the case comes in.
const isSm = useIsSm()
</script>

<template>
  <div class="flex flex-col gap-6 lg:gap-10" aria-busy="true" :aria-label="$t('common.loading')">
    <div class="flex flex-col gap-4">
      <div class="flex h-10 items-center justify-between gap-2">
        <span class="kd-skeleton h-6 w-20 rounded-md lg:w-36" />
        <span class="kd-skeleton h-6 w-32 rounded-md lg:h-8 lg:w-60" />
        <span class="kd-skeleton h-6 w-20 rounded-md lg:w-28" />
      </div>
      <span class="kd-skeleton h-16 rounded-3xl lg:h-[58px]" />
    </div>
    <div class="flex flex-col gap-4">
      <!-- the reel: its frame, a case-sized hole in the middle -->
      <div class="kd-skeleton relative grid h-68 place-items-center rounded-5xl lg:h-[278px]">
        <span class="size-40 rounded-4xl bg-neutral-2/60 lg:size-48" />
      </div>
      <span class="kd-skeleton h-[188px] rounded-5xl lg:h-20" />
      <span class="kd-skeleton h-16 rounded-3xl" />
    </div>
    <div class="flex flex-col gap-4">
      <div class="flex h-8 items-center"><span class="kd-skeleton h-6 w-40 rounded-md" /></div>
      <div class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
        <ItemDropCardSkeleton v-for="n in 12" :key="n" :compact="!isSm" />
      </div>
    </div>
  </div>
</template>
