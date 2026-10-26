<script setup lang="ts">
// Fills the free spot in a battles grid with the next thing to do: start your own (no hole at the row's end).
</script>

<template>
  <NuxtLink to="/pvp/create" class="kd-create kd-press flex min-h-48 flex-col items-center justify-center gap-3 rounded-5xl bg-neutral-2 p-4 text-center">
    <span class="kd-create-plus grid size-14 place-items-center rounded-full text-neutral-1"><UiIcon name="plus" :size="28" /></span>
    <span class="type-16-caps">{{ $t('pvp.create') }}</span>
    <span class="type-12-regular max-w-48 text-neutral-11">{{ $t('pvp.createTileText') }}</span>
  </NuxtLink>
</template>

<style scoped>
.kd-create {
  transition: background-color var(--dur-base) var(--ease-out);
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
  .kd-create:hover .kd-create-plus {
    transform: scale(1.08);
  }
}
</style>
