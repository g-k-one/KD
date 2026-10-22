<script setup lang="ts">
import type { Battle } from '#shared/types/api'

// Figma "BattleRow": Desktop = full-width row, Mobile = card. Waiting → Join, Live → Watch, Finished → View.
const props = defineProps<{ battle: Battle }>()
const now = useClock(1000)
const { onPointerMove } = useSpotlight()

const joined = computed(() => props.battle.slots.filter((s) => s.player).length)
const groups = computed(() => groupRounds(props.battle.rounds))
const visible = computed(() => groups.value.slice(0, 5))
const more = computed(() => groups.value.length - visible.value.length)
const value = computed(() => props.battle.cost * props.battle.size)
const clock = computed(() => battleClock(props.battle, now.value))
const round = computed(() => Math.min(props.battle.rounds.length, Math.max(1, clock.value.round + 1)))
// Live preview (player audit D9): which round is rolling and who leads right now
const live = computed(() => props.battle.status === 'live' && clock.value.round >= 0 && clock.value.round < props.battle.rounds.length)
const leader = computed(() => {
  if (!live.value) return null
  const totals = slotTotals(props.battle, clock.value.round)
  const best = totals.indexOf(Math.max(...totals))
  return totals[best] ? { player: props.battle.slots[best]?.player, total: totals[best]! } : null
})
const groupState = (g: { from: number; qty: number }) => {
  if (props.battle.status === 'finished') return 'done'
  if (!live.value) return 'default'
  const r = clock.value.round
  return r >= g.from + g.qty ? 'done' : r >= g.from ? 'current' : 'default'
}
const status = computed(() => {
  if (props.battle.status === 'waiting') return { cls: 'text-warning', dot: 'bg-warning', key: 'pvp.statusWaiting', params: { joined: joined.value, size: props.battle.size } }
  if (props.battle.status === 'live') return { cls: 'text-danger', dot: 'bg-danger kd-live-dot', key: 'pvp.statusLive', params: { round: round.value, rounds: props.battle.rounds.length } }
  return { cls: 'text-neutral-11', dot: 'bg-neutral-8', key: 'pvp.statusFinished', params: {} }
})
const action = computed(
  () =>
    ({
      waiting: { label: 'pvp.join', variant: 'primary' as const },
      live: { label: 'pvp.watch', variant: 'secondary' as const },
      finished: { label: 'pvp.view', variant: 'secondary' as const },
    })[props.battle.status],
)
</script>

<template>
  <NuxtLink
    :to="`/pvp/${battle.id}`"
    class="kd-brow kd-spotlight group flex flex-col gap-4 rounded-3xl bg-neutral-2 p-4 lg:flex-row lg:items-center lg:gap-6 lg:px-5"
    @pointermove="onPointerMove"
  >
    <div class="flex items-start justify-between gap-3 lg:contents">
      <div class="flex w-30 shrink-0 flex-col gap-1">
        <span class="type-16-caps">{{ $t(`pvp.modes.${battle.size}`) }}</span>
        <span class="type-12-caps flex items-center gap-1.5" :class="status.cls">
          <span class="size-1.5 rounded-full" :class="status.dot" />
          {{ $t(status.key, status.params) }}
        </span>
        <span v-if="battle.viewers" class="type-12 flex items-center gap-1 text-neutral-11 tabular-nums">
          <UiIcon name="eye" :size="14" />
          {{ battle.viewers }}
        </span>
      </div>
      <div class="flex shrink-0 items-center gap-1 lg:w-36">
        <template v-for="s in battle.slots" :key="s.slot">
          <span v-if="s.player" class="size-8 overflow-hidden rounded-full bg-neutral-7 ring-2 ring-neutral-2" :title="s.player.nickname">
            <img :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
          </span>
          <span v-else class="grid size-8 place-items-center rounded-full border border-dashed border-neutral-8 text-neutral-11">
            <UiIcon name="plus" :size="14" />
          </span>
        </template>
      </div>
    </div>

    <div class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
      <PvpCaseThumb v-for="g in visible" :key="`${g.slug}-${g.from}`" :image="g.image" :name="g.name" :qty="g.qty" :state="groupState(g)" />
      <span v-if="more > 0" class="type-12 shrink-0 rounded-md bg-neutral-6 px-2 py-1">+{{ more }}</span>
      <Transition name="kd-lead" mode="out-in">
        <span v-if="leader" :key="leader.player?.nickname" class="type-12 ml-auto hidden shrink-0 items-center gap-1.5 rounded-lg bg-neutral-3 px-2 py-1 xl:flex">
          <UiIcon name="crown" :size="14" class="text-coin" />
          <span class="max-w-24 truncate">{{ leader.player?.nickname }}</span>
          <UiPrice :amount="leader.total" size="s" tone="coin" />
        </span>
      </Transition>
    </div>

    <div class="flex items-end justify-between gap-3 lg:contents">
      <div class="flex shrink-0 flex-col gap-0.5 lg:w-40">
        <UiPrice :amount="value" size="l" />
        <span class="type-12-regular text-neutral-11">{{ $t('pvp.value') }}</span>
      </div>
      <div class="flex w-36 shrink-0 flex-col items-center gap-1.5 lg:w-40">
        <span class="kd-btn inline-flex h-10 w-full items-center justify-center rounded-lg type-12-caps" :class="`kd-btn-${action.variant}`">
          {{ $t(action.label) }}
        </span>
        <span class="type-12-regular flex items-center gap-1.5 text-neutral-11">
          {{ $t('pvp.cost') }}
          <UiPrice :amount="battle.cost" size="s" />
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.kd-brow {
  border: 1px solid var(--color-neutral-2);
  transition:
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}
@media (hover: hover) {
  .kd-brow:hover {
    border-color: var(--color-neutral-6);
  }
  .kd-brow:hover .kd-btn-primary {
    background-position: 100% 0;
  }
  .kd-brow:hover .kd-btn-secondary {
    background: var(--color-neutral-7);
  }
}
.kd-brow:active {
  transform: scale(0.99);
}
.kd-lead-enter-active,
.kd-lead-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-lead-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.kd-lead-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.kd-live-dot {
  animation: kd-live 1.4s ease-in-out infinite;
}
@keyframes kd-live {
  50% {
    opacity: 0.3;
  }
}
</style>
