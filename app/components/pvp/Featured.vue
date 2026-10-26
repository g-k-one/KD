<script setup lang="ts">
import type { Battle } from '#shared/types/api'

/*
 * The lobby's hero: the biggest live battle, playing out right in the list.
 * Every seat shows the drop of the last opened round (the weapon morphs into the next one), the running
 * total counts up and a race bar shows who is ahead; the leader wears the crown. Under it, the case being
 * opened now and a bar running down this round. One tap opens the room.
 */
const props = defineProps<{ battle: Battle }>()
const now = useClock(250)

const clock = computed(() => battleClock(props.battle, now.value))
const done = computed(() => Math.max(0, Math.min(props.battle.rounds.length, clock.value.round)))
const totals = computed(() => slotTotals(props.battle, done.value))
const maxTotal = computed(() => Math.max(1, ...totals.value))
const leader = computed(() => (Math.max(...totals.value) ? totals.value.indexOf(Math.max(...totals.value)) : null))
const lastDrops = computed(() => (done.value ? props.battle.results?.[done.value - 1]?.drops ?? [] : []))
const current = computed(() => props.battle.rounds[Math.min(props.battle.rounds.length - 1, Math.max(0, clock.value.round))])
const roundLeft = computed(() => 1 - Math.min(1, clock.value.inRound / props.battle.roundMs))
const pot = computed(() => props.battle.cost * props.battle.size)
</script>

<template>
  <!-- Desktop: a 220px side column (what is live and being opened on top, the pot and the way in at the
       bottom) next to the seats, which span its full height. Phones stack: info · seats · pot. -->
  <NuxtLink :to="`/pvp/${battle.id}`" class="kd-feat kd-press kd-press-wide group relative grid gap-4 overflow-hidden rounded-5xl p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:grid-rows-[1fr_auto] lg:gap-x-6 lg:gap-y-4 lg:p-6">
    <div class="flex items-start justify-between gap-4 lg:flex-col lg:items-stretch lg:justify-start lg:gap-4">
      <div class="flex flex-col gap-1">
        <span class="kd-feat-live type-12-caps flex items-center gap-1.5"><span class="kd-live-dot" />{{ $t('pvp.liveNow') }}</span>
        <span class="type-20-caps">{{ $t(`pvp.modes.${battle.size}`) }}</span>
        <span class="type-12 flex items-center gap-1 text-neutral-11 tabular-nums"><UiIcon name="eye" :size="14" />{{ battle.viewers }} {{ $t('pvp.watching') }}</span>
      </div>
      <!-- the case being opened now, big, with the round on a badge and the round timer under it -->
      <div v-if="current" class="flex flex-col items-center gap-2 lg:w-full">
        <span class="relative">
          <Transition name="kd-feat-case" mode="out-in">
            <img :key="clock.round" :src="current.image" :alt="current.name" class="kd-feat-case size-20 object-contain lg:size-32" draggable="false" />
          </Transition>
          <span class="type-12-caps absolute -right-2 bottom-1 rounded-md bg-danger px-1.5 py-0.5 text-neutral-15 tabular-nums">{{ Math.min(battle.rounds.length, clock.round + 1) }}/{{ battle.rounds.length }}</span>
        </span>
        <span class="h-1 w-full overflow-hidden rounded-full bg-neutral-4 max-lg:w-20">
          <span class="block h-full rounded-full bg-danger" :style="{ width: `${roundLeft * 100}%` }" />
        </span>
      </div>
    </div>

    <!-- the seats, racing -->
    <div class="grid min-w-0 gap-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:gap-3" :style="{ gridTemplateColumns: `repeat(${battle.size}, minmax(0, 1fr))` }">
      <div v-for="s in battle.slots" :key="s.slot" class="kd-fseat flex min-w-0 flex-col items-center justify-between gap-2 rounded-3xl p-2 lg:p-4" :class="leader === s.slot && 'is-lead'">
        <span class="flex max-w-full items-center gap-1.5">
          <span class="relative size-7 shrink-0 overflow-hidden rounded-full bg-neutral-6">
            <img v-if="s.player" :src="s.player.avatar" alt="" class="size-full object-cover" :class="s.player.bot && 'scale-75 object-contain'" />
          </span>
          <span class="type-12 truncate">{{ s.player?.nickname }}</span>
          <UiIcon v-if="leader === s.slot" name="crown" :size="14" class="shrink-0 text-coin" />
        </span>
        <!-- the seat's last drop fills the middle; nothing opened yet → the case in its hands, shaking -->
        <span class="flex w-full flex-1 flex-col items-center justify-center gap-1">
          <ItemArt v-if="lastDrops[s.slot]" morph float :image="lastDrops[s.slot]!.image" :rarity="lastDrops[s.slot]!.rarity" :size="84" class="h-24 w-full lg:h-32" />
          <span v-else class="grid h-24 w-full place-items-center lg:h-32">
            <img v-if="current" :src="current.image" alt="" class="kd-fseat-wait size-20 object-contain lg:size-24" draggable="false" />
          </span>
          <UiTextSwap v-if="lastDrops[s.slot]" :text="lastDrops[s.slot]!.skin" class="type-12 max-w-full truncate" :style="{ color: RARITY_COLOR[lastDrops[s.slot]!.rarity] }" />
        </span>
        <span class="flex w-full flex-col items-center gap-1.5">
          <span class="h-1.5 w-full overflow-hidden rounded-full bg-neutral-4">
            <span class="kd-frace block h-full rounded-full" :style="{ width: `${(totals[s.slot]! / maxTotal) * 100}%` }" />
          </span>
          <UiPrice :amount="totals[s.slot] ?? 0" size="l" :tone="leader === s.slot ? 'coin' : 'default'" />
        </span>
      </div>
    </div>

    <!-- the pot and the way in: bottom of the side column (desktop), last row (phones) -->
    <div class="flex items-center justify-between gap-3 lg:col-start-1 lg:row-start-2 lg:flex-col lg:items-stretch">
      <div class="flex flex-col gap-0.5">
        <span class="type-10-caps text-neutral-11">{{ $t('pvp.value') }}</span>
        <UiPrice :amount="pot" size="xl" />
      </div>
      <span class="kd-btn kd-btn-primary type-12-caps inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5">
        <UiIcon name="eye" :size="16" />
        {{ $t('pvp.watchLive') }}
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.kd-feat {
  background:
    radial-gradient(120% 140% at 0% 0%, rgb(240 68 56 / 0.16), transparent 50%),
    radial-gradient(100% 120% at 100% 100%, rgb(255 95 31 / 0.12), transparent 55%),
    var(--color-neutral-2);
  transition: translate var(--dur-base) var(--ease-spring);
}
@media (hover: hover) {
  .kd-feat:hover .kd-btn-primary {
    background-position: 100% 0;
  }
}
.kd-feat-live {
  color: var(--color-danger);
}
.kd-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  background: var(--color-danger);
  animation: kd-live 1.4s ease-in-out infinite;
}
@keyframes kd-live {
  50% {
    opacity: 0.3;
    scale: 1.6;
  }
}
.kd-feat-case {
  filter: drop-shadow(0 10px 16px rgb(0 0 0 / 0.55));
  animation: kd-case-bob 1.6s var(--ease-in-out) infinite;
}
@keyframes kd-case-bob {
  50% {
    translate: 0 -4px;
    rotate: -3deg;
  }
}
.kd-feat-case-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    scale var(--dur-slow) var(--ease-spring);
}
.kd-feat-case-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    scale var(--dur-fast) var(--ease-in);
}
.kd-feat-case-enter-from {
  opacity: 0;
  scale: 0.6;
}
.kd-feat-case-leave-to {
  opacity: 0;
  scale: 1.2;
}
.kd-fseat {
  background: rgb(255 255 255 / 0.03);
  transition:
    background-color var(--dur-slow) var(--ease-out),
    box-shadow var(--dur-slow) var(--ease-out);
}
.kd-fseat.is-lead {
  background: linear-gradient(180deg, rgb(253 176 34 / 0.14), rgb(255 255 255 / 0.02));
  box-shadow: inset 0 0 0 1px rgb(253 176 34 / 0.2);
}
.kd-fseat-wait {
  opacity: 0.8;
  animation: kd-shake-case 900ms var(--ease-in-out) infinite;
}
@keyframes kd-shake-case {
  20% {
    rotate: -6deg;
  }
  40% {
    rotate: 5deg;
  }
  60% {
    rotate: -3deg;
  }
  80% {
    rotate: 0deg;
    scale: 1.06;
  }
}
.kd-frace {
  background: linear-gradient(90deg, var(--color-neutral-9), var(--color-neutral-13));
  transition: width 700ms var(--ease-out);
}
.kd-fseat.is-lead .kd-frace {
  background: linear-gradient(90deg, var(--color-coin), #ffe58a);
}
</style>
