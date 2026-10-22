<script setup lang="ts">
import type { EventResponse } from '#shared/types/api'

// Event leaderboard: points are coins played on the event cases; the top 10 share the pool. Like the weekly
// race, the player's own row is pinned under the list with the distance to the last prize place.
const props = defineProps<{ data: EventResponse }>()
const outside = computed(() => !!props.data.me && !props.data.top.some((r) => r.you))
const toPrize = computed(() => Math.max(1, props.data.top[props.data.top.length - 1]!.points - (props.data.me?.points ?? 0) + 1))
const PODIUM = ['text-coin', 'text-neutral-14', 'text-brand-light']
</script>

<template>
  <div class="flex flex-col gap-1 rounded-5xl bg-neutral-2 p-3 lg:p-4">
    <div class="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-neutral-3 px-4 py-3">
      <span class="type-12-caps text-neutral-11">{{ $t('event.pool') }}</span>
      <UiPrice :amount="data.prizePool" size="xl" tone="coin" />
    </div>
    <div
      v-for="r in data.top"
      :key="r.rank"
      class="flex h-12 items-center gap-3 rounded-2xl px-3"
      :class="r.you ? 'bg-brand-24' : 'odd:bg-neutral-1/40'"
    >
      <span class="type-14-caps w-6 shrink-0 text-center tabular-nums" :class="PODIUM[r.rank - 1] ?? 'text-neutral-11'">{{ r.rank }}</span>
      <UiAvatar :src="r.avatar" :size="28" />
      <span class="type-14 min-w-0 flex-1 truncate">{{ r.you ? $t('race.you') : r.nickname }}</span>
      <span class="type-12 shrink-0 text-neutral-11 tabular-nums max-sm:hidden">{{ $t('event.pts', { n: formatCount(r.points) }) }}</span>
      <UiPrice :amount="r.prize" size="m" tone="coin" class="w-24 justify-end" />
    </div>
    <template v-if="outside && data.me">
      <span class="type-12-caps py-1 text-center text-neutral-8">···</span>
      <div class="flex h-12 items-center gap-3 rounded-2xl bg-brand-24 px-3">
        <span class="type-14-caps w-6 shrink-0 text-center tabular-nums text-neutral-12">{{ data.me.rank }}</span>
        <UiAvatar :src="data.me.avatar" :size="28" />
        <span class="type-14 min-w-0 flex-1 truncate">{{ $t('race.you') }} · {{ $t('event.pts', { n: formatCount(data.me.points) }) }}</span>
        <span class="type-12-caps shrink-0 text-right text-neutral-11">{{ $t('event.toPrize', { n: formatCount(toPrize) }) }}</span>
      </div>
    </template>
    <p class="type-12-regular px-1 pt-2 text-neutral-11">{{ $t('event.how') }}</p>
  </div>
</template>
