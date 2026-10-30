<script setup lang="ts">
import type { Battle } from '#shared/types/api'

/*
 * The battle list (the lobby and the home page): a row per battle (components/pvp/Card.vue), each its own block, under
 * the page's own line on the right when it has one. Phones: each battle a card. Nothing to show: the chicken with the
 * knife waits for a fight.
 */
defineProps<{ battles: Battle[] }>()
</script>

<template>
  <div class="kd-pvp-table flex min-w-0 flex-col gap-2 lg:gap-3">
    <div v-if="$slots.head" class="type-10-caps hidden h-6 items-center justify-end px-2 text-neutral-11 lg:flex"><slot name="head" /></div>
    <UiEmptyState v-if="!battles.length" :text="$t('pvp.noBattles')" art="empty-pvp" class="rounded-5xl bg-neutral-2 p-3" />
    <TransitionGroup v-else tag="div" name="kd-list" class="relative flex flex-col gap-2 lg:gap-3">
      <PvpCard v-for="b in battles" :key="b.id" :battle="b" />
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* the columns of every row: rounds · the battle scenario · players · the cost over the button */
.kd-pvp-table {
  --pvp-cols: 80px minmax(0, 1fr) 160px 176px;
}
.kd-list-enter-active {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.kd-list-leave-active {
  transition: opacity var(--dur-fast) var(--ease-in);
  position: absolute;
  width: 100%;
}
.kd-list-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.kd-list-leave-to {
  opacity: 0;
}
.kd-list-move {
  transition: transform var(--dur-slow) var(--ease-out);
}
</style>
