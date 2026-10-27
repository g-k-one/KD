<script setup lang="ts">
// Fills the first spot in the open seats with the next thing to do: start your own. Built like a battle card: an empty
// dashed stage (the plus chip and the title along its top, where the mode and the players sit; one plus where the case
// would be, the line under it) and the button where Join sits, so the row reads as one.
defineProps<{ compact?: boolean }>()
</script>

<template>
  <NuxtLink to="/pvp/create" class="kd-create kd-press flex min-w-0 flex-col gap-2 rounded-5xl bg-neutral-2 p-2">
    <!-- the dashed stage on the button's edges (16 px in), its 8 px corners concentric with the card's 24 -->
    <div class="kd-create-stage relative mx-2 mt-2 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3" :class="compact ? 'h-42 pt-6' : 'h-58 pt-8'">
      <span class="absolute inset-x-1.5 top-1.5 flex items-center gap-2">
        <span class="kd-create-chip grid shrink-0 place-items-center rounded-lg text-brand-light" :class="compact ? 'size-7' : 'size-8'"><UiIcon name="plus" :size="compact ? 16 : 18" /></span>
        <span class="type-12-caps truncate text-brand-light">{{ $t('pvp.newBattle') }}</span>
      </span>
      <span class="kd-create-plus grid place-items-center rounded-full text-neutral-1" :class="compact ? 'size-10' : 'size-14'"><UiIcon name="plus" :size="compact ? 20 : 24" /></span>
      <span class="type-12-regular text-center text-neutral-11">{{ $t('pvp.createTileText') }}</span>
    </div>
    <div class="px-2 pb-2">
      <span class="kd-btn kd-btn-primary flex w-full items-center justify-center rounded-lg" :class="compact ? 'type-12-caps h-10' : 'type-14-caps h-12'">{{ $t('pvp.create') }}</span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.kd-create {
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-create-chip {
  background: var(--color-brand-24);
}
.kd-create-stage {
  border-color: var(--color-neutral-5);
  transition: border-color var(--dur-base) var(--ease-out);
}
.kd-create-plus {
  background: linear-gradient(135deg, var(--color-brand-bright), var(--color-brand-base));
  box-shadow: var(--shadow-inner-primary);
  transition: transform var(--dur-base) var(--ease-spring);
}
@media (hover: hover) {
  .kd-create:hover {
    background: var(--color-neutral-3);
  }
  .kd-create:hover .kd-create-stage {
    border-color: var(--color-neutral-7);
  }
  .kd-create:hover .kd-create-plus {
    transform: scale(1.08);
  }
}
</style>
