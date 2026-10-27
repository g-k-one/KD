<script setup lang="ts">
// Fills the free spot in a battles grid with the next thing to do: start your own. Built row for row like a battle card:
// the plus chip and the title where the mode sits, one big plus where the cases fan, the line of what to do where the
// players stand, and the button where Join sits, so the row reads as one.
defineProps<{ compact?: boolean }>()
</script>

<template>
  <NuxtLink to="/pvp/create" class="kd-create kd-press flex min-w-0 flex-col rounded-5xl bg-neutral-2" :class="compact ? 'gap-2 p-3' : 'gap-3 p-4'">
    <div class="flex items-center gap-2">
      <span class="kd-create-chip grid shrink-0 place-items-center rounded-lg text-brand-light" :class="compact ? 'size-8' : 'size-10'"><UiIcon name="plus" :size="compact ? 18 : 22" /></span>
      <span class="type-14-caps truncate text-brand-light">{{ $t('pvp.newBattle') }}</span>
    </div>
    <!-- where the cases fan: one big plus in a dashed ring -->
    <div class="grid place-items-center" :class="compact ? 'h-28' : 'h-44'">
      <span class="kd-create-ring grid place-items-center rounded-full border-2 border-dashed" :class="compact ? 'size-24' : 'size-36'">
        <span class="kd-create-plus grid place-items-center rounded-full text-neutral-1" :class="compact ? 'size-12' : 'size-16'"><UiIcon name="plus" :size="compact ? 22 : 28" /></span>
      </span>
    </div>
    <!-- where the players stand -->
    <span class="type-12-regular flex items-center justify-center text-center text-neutral-11" :class="compact ? 'min-h-8' : 'min-h-12'">{{ $t('pvp.createTileText') }}</span>
    <span class="kd-btn kd-btn-primary flex w-full items-center justify-center rounded-lg" :class="compact ? 'type-12-caps mt-1 h-10' : 'type-14-caps mt-2 h-12'">{{ $t('pvp.create') }}</span>
  </NuxtLink>
</template>

<style scoped>
.kd-create {
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-create-chip {
  background: var(--color-brand-24);
}
.kd-create-ring {
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
  .kd-create:hover .kd-create-ring {
    border-color: var(--color-neutral-7);
  }
  .kd-create:hover .kd-create-plus {
    transform: scale(1.08);
  }
}
</style>
