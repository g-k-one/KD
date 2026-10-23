<script setup lang="ts">
import type { BattlePlayerRef } from '#shared/types/api'

/*
 * A seat on the room's podium (skin.fans race): a big card over the seat's own reel — the place right now (#1 gold,
 * #2 silver, #3 bronze, by the mode's rule), the avatar with its level, the name and the running total. The leader's
 * card stands raised; at the end the winner's glows green. A free seat offers Join (or Call bot for the creator).
 */
const props = defineProps<{
  player: BattlePlayerRef | null
  total?: number
  /** Place right now, 1-based; null before the first round */
  rank?: number | null
  winner?: boolean
  loser?: boolean
  compact?: boolean
  canJoin?: boolean
  canCallBot?: boolean
}>()
defineEmits<{ join: []; bot: [] }>()

const totalSrc = computed(() => props.total ?? 0)
const totalShown = useTransition(totalSrc, { duration: 700, transition: [0.22, 1, 0.36, 1] })
const PLACE = ['#ffd35c', '#cfd6e4', '#e0a070', '#8b93a7']
</script>

<template>
  <div
    class="kd-seat relative flex flex-col items-center gap-1.5 rounded-3xl text-center"
    :class="[compact ? 'px-1.5 pt-3 pb-2' : 'px-3 pt-5 pb-4', rank === 1 && !winner && !loser && 'is-first', winner && 'is-winner', loser && 'is-loser']"
    :style="{ '--place': rank ? PLACE[rank - 1] : 'transparent' }"
  >
    <template v-if="player">
      <FxBurst v-if="winner" :tier="3" color="var(--color-success)" :size="compact ? 90 : 160" />
      <Transition name="kd-rank" mode="out-in">
        <span v-if="rank" :key="rank" class="kd-rank absolute font-extrabold italic tabular-nums" :class="compact ? 'top-1 left-2 text-base' : 'top-2 left-3 text-2xl'">#{{ rank }}</span>
      </Transition>
      <span v-if="winner" class="kd-tag type-10-caps absolute -top-2 left-1/2 rounded-sm bg-success px-1.5 py-0.5 text-neutral-1">{{ $t('pvp.winner') }}</span>
      <span class="relative">
        <span class="kd-ava block overflow-hidden rounded-full bg-neutral-7" :class="compact ? 'size-10' : 'size-16'">
          <img :src="player.avatar" alt="" class="size-full object-cover" :class="player.bot && 'scale-75 object-contain'" />
        </span>
        <span class="type-10-caps absolute -right-1 -bottom-1 rounded-xs border border-white-12 bg-[#277cc1] px-1 leading-4">{{ player.level }}</span>
      </span>
      <span class="max-w-full truncate" :class="compact ? 'type-12' : 'type-14'">{{ player.you ? $t('pvp.you') : player.nickname }}</span>
      <UiPrice :amount="Math.round(totalShown)" :size="compact ? 's' : 'l'" :tone="winner ? 'success' : 'default'" class="tabular-nums" />
    </template>
    <template v-else>
      <span class="grid place-items-center rounded-full border border-dashed border-neutral-8 text-neutral-11" :class="compact ? 'size-10' : 'size-16'">
        <UiIcon name="user" :size="compact ? 18 : 24" />
      </span>
      <span class="text-neutral-12" :class="compact ? 'type-12' : 'type-14'">{{ $t('pvp.free') }}</span>
      <UiButton v-if="canJoin" size="m" :icon-only="compact" icon="plus" :aria-label="$t('pvp.join')" @click="$emit('join')">
        <template v-if="!compact">{{ $t('pvp.join') }}</template>
      </UiButton>
      <UiButton v-else-if="canCallBot" variant="secondary" size="m" :icon-only="compact" :icon="compact ? 'plus' : undefined" :aria-label="$t('pvp.callBot')" @click="$emit('bot')">
        <template v-if="!compact">{{ $t('pvp.callBot') }}</template>
      </UiButton>
      <span v-else class="type-12-regular text-neutral-11">{{ $t('pvp.waitingForPlayer') }}</span>
    </template>
  </div>
</template>

<style scoped>
.kd-seat {
  background: var(--color-neutral-2);
  box-shadow: inset 0 0 0 1px var(--color-neutral-4);
  transition:
    transform var(--dur-slow) var(--ease-spring),
    box-shadow var(--dur-slow) var(--ease-out),
    background-color var(--dur-slow) var(--ease-out),
    opacity var(--dur-slow) var(--ease-out);
}
.kd-rank {
  color: var(--place);
  text-shadow: 0 0 12px color-mix(in srgb, var(--place) 50%, transparent);
}
/* the leader stands on the top step */
.kd-seat.is-first {
  transform: translateY(-10px);
  background: linear-gradient(180deg, color-mix(in srgb, var(--place) 16%, var(--color-neutral-2)), var(--color-neutral-2) 70%);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--place) 55%, transparent),
    0 12px 32px -12px color-mix(in srgb, var(--place) 60%, transparent);
}
.kd-seat.is-first .kd-ava {
  box-shadow: 0 0 0 2px var(--place);
}
.kd-seat.is-winner {
  transform: translateY(-14px);
  background: linear-gradient(180deg, rgb(18 183 106 / 0.22), var(--color-neutral-2) 75%);
  box-shadow:
    inset 0 0 0 1px rgb(18 183 106 / 0.6),
    0 14px 40px -12px rgb(18 183 106 / 0.7);
  animation: kd-win 900ms var(--ease-spring);
}
.kd-seat.is-loser {
  opacity: 0.55;
}
@keyframes kd-win {
  40% {
    scale: 1.06;
  }
}
.kd-tag {
  transform: translateX(-50%);
  animation: kd-tag-in 600ms var(--ease-spring) 200ms both;
}
@keyframes kd-tag-in {
  from {
    opacity: 0;
    transform: translate(-50%, 6px) scale(0.6);
  }
}
.kd-rank-enter-active,
.kd-rank-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}
.kd-rank-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(1.4);
}
.kd-rank-leave-to {
  opacity: 0;
}
</style>
