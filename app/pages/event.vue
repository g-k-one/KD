<script setup lang="ts">
/*
 * The event hub (docs/ux-research-v3.md #19, #33, #34, #49): Dziady Night, the Polish night of the dead.
 *   Hero — the story, the countdown and the prize pool, one way in.
 *   Section cards — cases · leaderboard · giveaway, each a tap to its part (Casehug's event cards).
 *   Ladder — five themed cases, cheap to the final boss; playing them earns event points.
 *   Leaderboard by event points, and a daily giveaway with a free ticket for playing the event today.
 */
useHead({ title: 'Dziady Night · KurwaDROP' })
const { data, endsIn, now } = useEvent()

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
const giveawayIn = computed(() => (data.value ? countdown(data.value.giveaway.endsAt, now.value) : ''))
const boss = computed(() => data.value?.cases[data.value.cases.length - 1] ?? null)
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <UiPageBar :title="data?.name ?? $t('event.title')" :left="[{ label: $t('case.allCases'), icon: 'arrow-left', to: '/' }]" />

    <template v-if="data">
      <!-- Hero: the story, the clock, the pool -->
      <section class="kd-ev-hero relative isolate flex flex-col overflow-hidden rounded-5xl px-5 pt-6 lg:min-h-80 lg:justify-center lg:px-10 lg:py-10">
        <div class="relative z-10 flex flex-col gap-4 lg:max-w-[560px]">
          <div class="flex flex-col gap-2">
            <p class="type-12-caps lg:type-16-caps text-[#c4b5fd]">{{ $t('event.eyebrow') }}</p>
            <h1 class="text-[32px] leading-9 font-extrabold uppercase lg:type-48-caps">{{ data.name }}</h1>
          </div>
          <p class="type-14 text-neutral-13 lg:type-16-medium">{{ $t('event.story') }}</p>
          <div class="flex flex-wrap items-center gap-2">
            <span class="kd-ev-pill type-14-caps flex h-10 items-center gap-2 rounded-xl px-3 tabular-nums"><UiIcon name="history" :size="18" />{{ endsIn }}</span>
            <span class="kd-ev-pill flex h-10 items-center gap-2 rounded-xl px-3">
              <span class="type-12-caps text-neutral-12">{{ $t('event.pool') }}</span>
              <UiPrice :amount="data.prizePool" size="m" tone="coin" />
            </span>
          </div>
          <UiButton size="l" icon="cases" class="w-full sm:w-72" @click="go('ladder')">{{ $t('event.cta') }}</UiButton>
        </div>
        <img v-if="boss" :src="boss.image" alt="" class="kd-ev-boss pointer-events-none relative mx-auto -mb-4 w-64 lg:absolute lg:right-10 lg:bottom-[-24px] lg:mb-0 lg:w-[380px]" draggable="false" />
      </section>

      <!-- The event's parts, one tap each -->
      <section class="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:gap-4">
        <button type="button" class="kd-ev-card kd-press flex w-64 shrink-0 snap-start items-center gap-3 rounded-5xl p-3 text-left md:w-auto" @click="go('ladder')">
          <img v-if="data.cases[0]" :src="data.cases[2]?.image ?? data.cases[0].image" alt="" class="size-16 shrink-0 object-contain" />
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="type-10-caps text-[#c4b5fd]">{{ $t('event.tag') }}</span>
            <span class="type-16-caps">{{ $t('event.cases') }}</span>
            <span class="type-12 truncate text-neutral-11">{{ $t('event.casesLine', { n: data.cases.length }) }}</span>
          </span>
        </button>
        <button type="button" class="kd-ev-card kd-press flex w-64 shrink-0 snap-start items-center gap-3 rounded-5xl p-3 text-left md:w-auto" @click="go('leaderboard')">
          <span class="grid size-16 shrink-0 place-items-center rounded-2xl bg-neutral-3 text-coin"><UiIcon name="trophy" :size="32" /></span>
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="type-10-caps text-[#c4b5fd]">{{ $t('event.tag') }}</span>
            <span class="type-16-caps">{{ $t('event.leaderboard') }}</span>
            <span class="type-12 truncate text-neutral-11">{{ data.me ? $t('event.youRank', { n: data.me.rank }) : $t('event.top10') }}</span>
          </span>
        </button>
        <button type="button" class="kd-ev-card kd-press flex w-64 shrink-0 snap-start items-center gap-3 rounded-5xl p-3 text-left md:w-auto" @click="go('giveaway')">
          <ItemArt :image="data.giveaway.prize.image" :rarity="data.giveaway.prize.rarity" :size="48" class="w-16 shrink-0" />
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="type-10-caps text-[#c4b5fd]">{{ $t('event.tag') }}</span>
            <span class="type-16-caps">{{ $t('event.giveaway') }}</span>
            <span class="type-12 truncate text-neutral-11 tabular-nums">{{ $t('event.giveawayLine', { time: giveawayIn }) }}</span>
          </span>
        </button>
      </section>

      <section id="ladder" class="flex scroll-mt-24 flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h2 class="type-20-caps">{{ $t('event.ladder') }}</h2>
          <p class="type-14-regular text-neutral-12">{{ $t('event.ladderHint') }}</p>
        </div>
        <EventLadder :cases="data.cases" />
      </section>

      <div class="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-6">
        <section id="leaderboard" class="flex scroll-mt-24 flex-col gap-3">
          <div class="flex items-end justify-between gap-3">
            <h2 class="type-20-caps">{{ $t('event.leaderboard') }}</h2>
            <span v-if="data.me" class="type-12-caps text-neutral-11">{{ $t('event.yourPoints', { n: formatCount(data.points) }) }}</span>
          </div>
          <EventLeaderboard :data="data" />
        </section>
        <section id="giveaway" class="flex scroll-mt-24 flex-col gap-3">
          <h2 class="type-20-caps">{{ $t('event.giveaway') }}</h2>
          <EventGiveaway :data="data" :now="now" @update="(e) => (data = e)" />
        </section>
      </div>
    </template>

    <div v-else class="flex flex-col gap-4">
      <span class="kd-skeleton h-80 rounded-5xl" />
      <span class="kd-skeleton h-60 rounded-5xl" />
    </div>
  </div>
</template>

<style scoped>
.kd-ev-hero {
  background:
    radial-gradient(60% 90% at 85% 70%, rgb(87 227 137 / 0.28), transparent 70%),
    linear-gradient(144deg, var(--color-neutral-3) 10%, #2a1650 70%, #3b1f6e 100%);
}
.kd-ev-pill {
  background: rgb(12 13 16 / 0.45);
  box-shadow: inset 0 0 0 1px rgb(196 181 253 / 0.18);
}
.kd-ev-boss {
  filter: drop-shadow(0 20px 40px rgb(0 0 0 / 0.5)) drop-shadow(0 0 40px rgb(87 227 137 / 0.35));
  animation: kd-ev-float 4s ease-in-out infinite;
}
@keyframes kd-ev-float {
  50% {
    translate: 0 -10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-ev-boss {
    animation: none;
  }
}
.kd-ev-card {
  background: linear-gradient(120deg, rgb(139 92 246 / 0.14), var(--color-neutral-2) 60%);
  box-shadow: inset 0 0 0 1px rgb(139 92 246 / 0.16);
}
</style>
