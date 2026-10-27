<script setup lang="ts">
// Fills the free spot in a battles grid with the next thing to do: start your own. Built like a battle card: an empty
// dashed stage (its title top left, where the mode chip sits; one plus where the case would be, the line under it) and
// the button where Join sits, so the row reads as one.
</script>

<template>
  <NuxtLink to="/pvp/create" class="kd-create kd-press flex min-w-0 flex-col gap-2 rounded-5xl bg-neutral-2 p-2">
    <div class="kd-create-stage relative flex h-56 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-4 max-sm:h-40 max-sm:gap-2">
      <span class="type-14-caps absolute top-2 left-3 flex h-8 items-center">{{ $t('pvp.newBattle') }}</span>
      <span class="kd-create-plus grid size-16 place-items-center rounded-full text-neutral-1 max-sm:size-11"><UiIcon name="plus" :size="28" /></span>
      <span class="type-12-regular text-center text-neutral-11">{{ $t('pvp.createTileText') }}</span>
    </div>
    <div class="px-2 pb-2">
      <span class="kd-btn kd-btn-primary type-12-caps flex h-10 items-center justify-center rounded-lg">{{ $t('pvp.create') }}</span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.kd-create {
  transition: background-color var(--dur-base) var(--ease-out);
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
