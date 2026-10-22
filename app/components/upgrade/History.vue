<script setup lang="ts">
import type { HistoryEntry, HistoryResponse } from '#shared/types/api'

// "My upgrades" right on the page (player audit D8): each row shows the chance zone and where the roll landed.
const props = defineProps<{ version: number }>()
const session = useSessionStore()
const entries = ref<HistoryEntry[]>([])
async function load() {
  if (!session.user) return (entries.value = [])
  try {
    const res = await $fetch<HistoryResponse>('/api/history')
    entries.value = res.entries.filter((e) => e.game === 'upgrade').slice(0, 8)
  } catch {
    entries.value = []
  }
}
onMounted(load)
watch(() => [props.version, session.user?.id], load)
</script>

<template>
  <section v-if="entries.length" class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="type-16-caps lg:type-20-caps">{{ $t('upgrade.myUpgrades') }}</h2>
      <NuxtLink to="/profile?tab=history" class="type-12-caps text-neutral-11 hover:text-neutral-15">{{ $t('upgrade.allHistory') }}</NuxtLink>
    </div>
    <TransitionGroup tag="ul" name="kd-hist" class="flex flex-col gap-1.5">
      <li
        v-for="e in entries"
        :key="e.id"
        class="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl bg-neutral-2 px-4 py-3 lg:grid-cols-[1.3fr_170px_1fr_190px_70px]"
      >
        <span class="type-14 min-w-0 truncate">{{ e.title }}</span>
        <span class="flex items-center gap-1.5 max-lg:hidden">
          <UiPrice :amount="e.bet" size="s" tone="muted" />
          <UiIcon name="arrow-left" :size="12" class="rotate-180 text-neutral-10" />
          <UiPrice v-if="e.targetPrice" :amount="e.targetPrice" size="s" :tone="e.status === 'won' ? 'coin' : 'muted'" />
        </span>
        <!-- 0–100 bar: green up to the chance, white tick at the roll -->
        <span v-if="e.chance != null && e.roll != null" class="relative col-span-2 h-2 rounded-full bg-neutral-5 lg:col-span-1">
          <span class="absolute inset-y-0 left-0 rounded-full bg-success/60" :style="{ width: `${e.chance / 100}%` }" />
          <span class="absolute -top-1 h-4 w-0.5 rounded-full bg-neutral-15 shadow-[0_0_6px_white]" :style="{ left: `calc(${e.roll}% - 1px)` }" />
        </span>
        <span v-else class="max-lg:hidden" />
        <span class="type-12 text-neutral-11 tabular-nums max-lg:hidden">
          <template v-if="e.roll != null && e.chance != null">{{ $t('upgrade.rollLine', { roll: e.roll.toFixed(2), chance: (e.chance / 100).toFixed(2) }) }}</template>
        </span>
        <span class="type-12-caps row-start-1 justify-self-end rounded-md px-2 py-1 max-lg:col-start-2 lg:row-start-auto" :class="e.status === 'won' ? 'bg-success-24 text-success' : 'bg-danger-24 text-danger'">
          {{ e.status === 'won' ? $t('account.won') : $t('account.lost') }}
        </span>
      </li>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.kd-hist-enter-active {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.kd-hist-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.kd-hist-move {
  transition: transform var(--dur-slow) var(--ease-out);
}
</style>
