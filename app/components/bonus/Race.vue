<script setup lang="ts">
// Weekly race (docs/ux-research-v3.md #5, Clash.gg / Key-Drop): coins played this week, the top 10 share the pool.
// The player's own row is pinned under the list when they are outside it — the distance to a prize is the point.
const { data } = useRace()
const now = useClock(1000)
const ends = computed(() => (data.value ? countdownLong(data.value.endsAt, now.value) : ''))
const me = computed(() => data.value?.me ?? null)
const outside = computed(() => !!me.value && !data.value?.top.some((r) => r.you))
const PODIUM = ['text-coin', 'text-neutral-14', 'text-brand-light']
</script>

<template>
  <section v-if="data" class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="type-20-caps flex-1">{{ $t('race.title') }}</h2>
      <span class="type-12-caps flex items-center gap-1.5 text-neutral-11">
        <UiIcon name="history" :size="16" />
        <span class="tabular-nums">{{ $t('race.ends', { time: ends }) }}</span>
      </span>
    </div>
    <div class="flex flex-col gap-1 rounded-5xl bg-neutral-2 p-3 lg:p-4">
      <div class="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-neutral-3 px-4 py-3">
        <span class="type-12-caps text-neutral-11">{{ $t('race.pool') }}</span>
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
        <UiPrice :amount="r.wagered" size="s" tone="muted" compact class="max-sm:hidden" />
        <UiPrice :amount="r.prize" size="m" tone="coin" class="w-24 justify-end" />
      </div>
      <template v-if="outside && me">
        <span class="type-12-caps py-1 text-center text-neutral-8">···</span>
        <div class="flex h-12 items-center gap-3 rounded-2xl bg-brand-24 px-3">
          <span class="type-14-caps w-6 shrink-0 text-center tabular-nums text-neutral-12">{{ me.rank }}</span>
          <UiAvatar :src="me.avatar" :size="28" />
          <span class="type-14 min-w-0 flex-1 truncate">{{ $t('race.you') }}</span>
          <UiPrice :amount="me.wagered" size="s" tone="muted" compact />
          <span class="type-12-caps w-36 shrink-0 text-right text-neutral-11">{{ $t('race.toPrize', { amount: formatCoins(Math.max(0, data.top[data.top.length - 1]!.wagered - me.wagered + 100)) }) }}</span>
        </div>
      </template>
      <p class="type-12-regular px-1 pt-2 text-neutral-11">{{ $t('race.how') }}</p>
    </div>
  </section>
</template>
