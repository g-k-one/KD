<script setup lang="ts">
import type { HistoryEntry, HistoryResponse } from '#shared/types/api'

// "My upgrades" right on the page (player audit D8): the profile's history rows, each with the chance zone and where
// the roll landed; a row opens its check.
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
    <!-- the same rows as the profile's game history and the Provably Fair rolls; an upgrade adds its chance zone
         (green up to the chance, a white tick where the roll landed) under the name -->
    <TransitionGroup tag="ul" name="kd-hist" class="flex flex-col gap-1 rounded-5xl bg-neutral-2 p-3 lg:p-4">
      <li v-for="e in entries" :key="e.id">
        <NuxtLink
          :to="e.nonce ? `/fairness?roll=${e.id}` : undefined"
          class="kd-hrow kd-press kd-press-wide grid grid-cols-[40px_minmax(0,1fr)_44px_76px_24px] items-center gap-2.5 rounded-2xl px-1.5 py-2 lg:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_160px_32px] lg:gap-4 lg:px-3 lg:py-3"
        >
          <span class="grid size-10 place-items-center rounded-xl bg-neutral-3 text-neutral-13 lg:size-12"><UiIcon name="upgrade" :size="18" /></span>
          <span class="flex min-w-0 flex-col gap-1">
            <span class="type-14 truncate">{{ e.title }}</span>
            <span class="type-12-regular truncate text-neutral-11 tabular-nums">
              <template v-if="e.roll != null && e.chance != null">{{ $t('upgrade.rollLine', { roll: e.roll.toFixed(2), chance: (e.chance / 100).toFixed(2) }) }} · </template>{{ timeAgo(e.at) }}
            </span>
            <span v-if="e.chance != null && e.roll != null" class="relative mt-0.5 h-1.5 w-full max-w-48 rounded-full bg-neutral-5">
              <span class="absolute inset-y-0 left-0 rounded-full bg-success/60" :style="{ width: `${e.chance / 100}%` }" />
              <span class="absolute -top-1 h-3.5 w-0.5 rounded-full bg-neutral-15 shadow-[0_0_6px_white]" :style="{ left: `calc(${e.roll}% - 1px)` }" />
            </span>
          </span>
          <HistoryItems :entry="e" />
          <UiPrice :amount="e.payout" :tone="e.status === 'lost' ? 'muted' : 'success'" class="justify-self-end" />
          <span class="kd-hrow-check grid size-7 place-items-center justify-self-end rounded-lg lg:size-8"><UiIcon name="shield-check" :size="18" /></span>
        </NuxtLink>
      </li>
    </TransitionGroup>
  </section>
</template>

<style scoped>
/* as the profile's history rows */
.kd-hrow {
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-hrow-check {
  color: var(--color-neutral-10);
  transition:
    color var(--dur-base) var(--ease-out),
    background-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-hrow:hover {
    background: var(--color-neutral-3);
  }
  .kd-hrow:hover .kd-hrow-check {
    color: var(--color-success);
    background: rgb(18 183 106 / 0.12);
  }
}
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
