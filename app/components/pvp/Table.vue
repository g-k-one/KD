<script setup lang="ts">
import type { Battle } from '#shared/types/api'

/*
 * The battle list (the lobby and the home page), skin.club's: a header bar naming the columns on desktop — rounds, the
 * battle scenario, players — then a row per battle (components/pvp/Card.vue), each its own block. Phones: no header;
 * each battle a card. Nothing to show: the chicken with the knife waits for a fight.
 */
defineProps<{ battles: Battle[] }>()
</script>

<template>
  <div class="kd-pvp-table flex min-w-0 flex-col gap-2 lg:gap-3">
    <div class="kd-th type-10-caps hidden h-8 items-center gap-1.5 px-2 text-neutral-11 lg:grid">
      <span class="text-center">{{ $t('pvp.rounds') }}</span>
      <span class="pl-1">{{ $t('pvp.scenario') }}</span>
      <span class="text-center">{{ $t('pvp.players') }}</span>
      <span class="flex justify-center"><slot name="head" /></span>
    </div>
    <UiEmptyState v-if="!battles.length" :text="$t('pvp.noBattles')" art="empty-pvp" class="rounded-5xl bg-neutral-2 p-3" />
    <TransitionGroup v-else tag="div" name="kd-list" class="relative flex flex-col gap-2 lg:gap-3">
      <PvpCard v-for="b in battles" :key="b.id" :battle="b" />
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* the columns, shared with every row: rounds · the battle scenario · players · the cost over the button */
.kd-pvp-table {
  --pvp-cols: 108px minmax(0, 1fr) 160px 176px;
}
.kd-th {
  grid-template-columns: var(--pvp-cols);
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
