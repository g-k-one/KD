<script setup lang="ts">
import type { Battle } from '#shared/types/api'

/*
 * The battle table (the lobby and the home page), built like the game history's (components/history/Table.vue):
 * the column headers on desktop — battle, players, cases — then a line per battle (components/pvp/Card.vue).
 * Phones: no headers; each battle in three short lines. Nothing to show: the chicken with the knife waits for a fight.
 */
defineProps<{ battles: Battle[] }>()
</script>

<template>
  <div class="kd-pvp-table flex min-w-0 flex-col">
    <div class="kd-th type-10-caps sticky top-0 z-[1] hidden h-9 items-center gap-4 border-b border-neutral-4 px-3 text-neutral-11 lg:grid">
      <span>{{ $t('pvp.mode') }}</span>
      <span>{{ $t('pvp.players') }}</span>
      <span>{{ $t('pvp.cases') }}</span>
      <span />
    </div>
    <UiEmptyState v-if="!battles.length" :text="$t('pvp.noBattles')" art="empty-pvp" class="m-3" />
    <TransitionGroup v-else tag="ul" name="kd-list" class="relative flex flex-col">
      <PvpCard v-for="b in battles" :key="b.id" :battle="b" />
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* the columns, shared with every line: who and what (the mode, the players) · the cases · the button */
.kd-pvp-table {
  --pvp-cols: 176px 168px minmax(0, 1fr) 168px;
}
.kd-th {
  grid-template-columns: var(--pvp-cols);
  background: var(--color-neutral-2);
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
