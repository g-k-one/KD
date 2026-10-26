<script setup lang="ts">
import type { BattlesResponse } from '#shared/types/api'

// Battles on the home page (#12, Skin.Club): the same battle cards as the lobby — open seats first, then live rooms,
// one tap to join or watch. The lobby's list, fetched and refreshed here on its own; quiet when nothing is going on.
const { data, refresh } = useFetch<BattlesResponse>('/api/battles', { key: 'home-battles', server: false, lazy: true })
useIntervalFn(() => document.visibilityState === 'visible' && refresh(), 5000)

const ORDER = { waiting: 0, live: 1, finished: 2 } as const
const list = computed(() =>
  (data.value?.battles ?? [])
    .filter((b) => b.status !== 'finished')
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.cost - a.cost)
    .slice(0, 4),
)
// false through hydration (the server renders desktop), then the real width
const mounted = useMounted()
const phoneQuery = useMediaQuery('(max-width: 639.98px)')
const isPhone = computed(() => mounted.value && phoneQuery.value)
const liveCount = computed(() => (data.value?.battles ?? []).filter((b) => b.status === 'live').length)
</script>

<template>
  <section v-if="list.length" class="flex flex-col gap-4">
    <UiSectionHeader :title="$t('home.battles')">
      <template #actions>
        <span v-if="liveCount" class="type-12-caps flex items-center gap-1.5 text-neutral-11"><span class="kd-live-dot" />{{ liveCount }} {{ $t('pvp.live') }}</span>
        <NuxtLink to="/pvp" class="type-12-caps flex h-8 items-center gap-0.5 text-neutral-12 hover:text-neutral-15">{{ $t('home.allBattles') }}<UiIcon name="chevron-right" :size="14" /></NuxtLink>
      </template>
    </UiSectionHeader>
    <div class="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
      <PvpCard v-for="b in list" :key="b.id" :battle="b" :compact="isPhone" />
      <!-- fewer than four open: the free spot invites to start one -->
      <PvpCreateTile v-if="data && list.length < 4" />
    </div>
  </section>
</template>

<style scoped>
.kd-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--color-danger);
  animation: kd-live 1.6s ease-in-out infinite;
}
@keyframes kd-live {
  50% {
    opacity: 0.3;
  }
}
</style>
