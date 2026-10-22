<script setup lang="ts">
import type { Battle, BattlesResponse } from '#shared/types/api'

// Battles on the home page (#12, Skin.Club): the open seats and the live rooms, one tap to join or watch.
// The lobby's list, fetched and refreshed here on its own; quiet when nothing is going on.
const { data, refresh } = useFetch<BattlesResponse>('/api/battles', { key: 'home-battles', server: false, lazy: true })
useIntervalFn(() => refresh(), 5000)

const ORDER = { waiting: 0, live: 1, finished: 2 } as const
const list = computed(() =>
  (data.value?.battles ?? [])
    .filter((b) => b.status !== 'finished')
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.cost - a.cost)
    .slice(0, 4),
)
const liveCount = computed(() => (data.value?.battles ?? []).filter((b) => b.status === 'live').length)
const joined = (b: Battle) => b.slots.filter((s) => s.player).length
</script>

<template>
  <section v-if="list.length" class="flex flex-col gap-4">
    <UiSectionHeader :title="$t('home.battles')">
      <template #actions>
        <span v-if="liveCount" class="type-12-caps flex items-center gap-1.5 text-neutral-11"><span class="kd-live-dot" />{{ liveCount }} {{ $t('pvp.live') }}</span>
        <NuxtLink to="/pvp" class="type-12-caps flex h-8 items-center gap-0.5 text-neutral-12 hover:text-neutral-15">{{ $t('home.allBattles') }}<UiIcon name="chevron-right" :size="14" /></NuxtLink>
      </template>
    </UiSectionHeader>
    <div class="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4 lg:gap-3">
      <NuxtLink
        v-for="b in list"
        :key="b.id"
        :to="`/pvp/${b.id}`"
        class="kd-hbattle kd-press flex w-64 shrink-0 snap-start flex-col gap-3 rounded-4xl bg-neutral-2 p-3 md:w-auto"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="type-14-caps">{{ $t(`pvp.modes.${b.size}`) }}</span>
          <span v-if="b.status === 'live'" class="type-10-caps flex items-center gap-1.5 text-danger"><span class="kd-live-dot" />{{ $t('pvp.live') }}</span>
          <span v-else class="type-10-caps text-neutral-11 tabular-nums">{{ $t('pvp.statusWaiting', { joined: joined(b), size: b.size }) }}</span>
        </div>
        <div class="flex gap-1.5">
          <PvpCaseThumb v-for="r in groupRounds(b.rounds).slice(0, 4)" :key="r.from" :image="r.image" :name="r.name" :qty="r.qty" size="s" />
        </div>
        <div class="flex items-center justify-between gap-2">
          <UiPrice :amount="b.cost" size="m" tone="coin" />
          <span class="kd-hbattle-cta type-12-caps flex h-8 items-center rounded-lg px-3" :class="b.status === 'waiting' && 'is-join'">
            {{ b.status === 'waiting' ? $t('pvp.join') : $t('pvp.watch') }}
          </span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.kd-hbattle {
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-hbattle-cta {
  background: var(--color-neutral-4);
  color: var(--color-neutral-14);
}
.kd-hbattle-cta.is-join {
  background: var(--color-brand-base);
  color: var(--color-neutral-15);
}
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
@media (hover: hover) {
  .kd-hbattle:hover {
    background: var(--color-neutral-3);
  }
}
</style>
