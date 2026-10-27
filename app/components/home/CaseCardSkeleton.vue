<script setup lang="ts">
// A case card while the catalog loads: the card's own frame, art box and lines (the same type and paddings, the text
// transparent), so the grid keeps its height and nothing moves when the cases come in.
</script>

<template>
  <div class="flex h-full flex-col items-center gap-2 rounded-5xl border border-neutral-4 max-sm:rounded-4xl bg-neutral-2" aria-hidden="true">
    <div class="relative grid aspect-square w-full place-items-center lg:aspect-auto lg:h-55">
      <span class="kd-skeleton size-[62%] rounded-4xl lg:size-36" />
    </div>
    <div class="flex w-full flex-col items-center gap-2 px-3 pb-3 lg:gap-3 lg:px-4 lg:pb-[14px]">
      <span class="kd-skeleton type-12-caps lg:type-14-caps w-2/3 rounded-md text-transparent">&nbsp;</span>
      <span class="kd-skeleton relative flex w-full justify-center rounded-lg py-1.5 lg:py-2"><UiPrice :amount="0" size="l" class="invisible" /></span>
      <span class="kd-skeleton h-4 w-1/3 rounded-md" />
    </div>
  </div>
</template>
