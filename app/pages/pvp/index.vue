<script setup lang="ts">
import type { BattlesResponse, BattleStatus } from '#shared/types/api'

useHead({ title: 'PvP · KurwaDROP' })
const { t } = useI18n()
const { data, refresh } = await useFetch<BattlesResponse>('/api/battles', { key: 'battles' })
useIntervalFn(() => refresh(), 5000)

const filter = ref<BattleStatus | 'all'>('all')
const counts = computed(() => {
  const list = data.value?.battles ?? []
  return { all: list.length, waiting: list.filter((b) => b.status === 'waiting').length, live: list.filter((b) => b.status === 'live').length, finished: list.filter((b) => b.status === 'finished').length }
})
const tabs = computed(() =>
  (['all', 'waiting', 'live', 'finished'] as const).map((v) => ({ value: v, label: t(`pvp.${v}`), count: counts.value[v] })),
)
const list = computed(() => (data.value?.battles ?? []).filter((b) => filter.value === 'all' || b.status === filter.value))
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-0 lg:pt-10">
    <div class="flex items-center justify-between gap-4">
      <h1 class="type-20-caps md:type-28 uppercase">{{ $t('pvp.title') }}</h1>
      <UiButton icon="plus" to="/pvp/create">{{ $t('pvp.create') }}</UiButton>
    </div>
    <UiTabs v-model="filter" :tabs="tabs" />
    <TransitionGroup tag="div" name="kd-list" class="relative flex flex-col gap-2">
      <PvpRow v-for="b in list" :key="b.id" :battle="b" />
    </TransitionGroup>
    <p v-if="!list.length" class="type-14-regular rounded-3xl border border-neutral-4 py-12 text-center text-neutral-12">{{ $t('pvp.empty') }}</p>
  </div>
</template>

<style scoped>
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
