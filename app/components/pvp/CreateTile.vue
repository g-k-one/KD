<script setup lang="ts">
// Fills the free spot in a battles grid with the next thing to do: start your own. Built like a battle card (the mode
// chip's place holds a plus, the case tiles are empty dashed slots waiting for your picks, the button where Join sits),
// so the row reads as one.
</script>

<template>
  <NuxtLink to="/pvp/create" class="kd-create kd-press flex min-w-0 flex-col gap-4 rounded-5xl bg-neutral-2 p-4">
    <div class="flex h-8 items-center gap-2">
      <span class="kd-create-chip grid size-8 shrink-0 place-items-center rounded-lg text-brand-light"><UiIcon name="plus" :size="18" /></span>
      <span class="type-16-caps">{{ $t('pvp.newBattle') }}</span>
    </div>
    <!-- three empty case slots, the middle one with the plus: pick the cases -->
    <div class="grid grid-cols-3 gap-2">
      <span v-for="i in 3" :key="i" class="kd-create-slot grid aspect-square place-items-center rounded-2xl border-2 border-dashed">
        <span v-if="i === 2" class="kd-create-plus grid size-12 place-items-center rounded-full text-neutral-1"><UiIcon name="plus" :size="24" /></span>
      </span>
    </div>
    <span class="type-12-regular text-center text-neutral-11">{{ $t('pvp.createTileText') }}</span>
    <span class="kd-btn kd-btn-primary type-12-caps mt-auto flex h-10 items-center justify-center gap-2 rounded-lg">
      <UiIcon name="plus" :size="16" />{{ $t('pvp.create') }}
    </span>
  </NuxtLink>
</template>

<style scoped>
.kd-create {
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-create-chip {
  background: var(--color-brand-24);
}
.kd-create-slot {
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
  .kd-create:hover .kd-create-slot {
    border-color: var(--color-neutral-7);
  }
  .kd-create:hover .kd-create-plus {
    transform: scale(1.08);
  }
}
</style>
