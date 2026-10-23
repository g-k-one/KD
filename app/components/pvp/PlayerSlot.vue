<script setup lang="ts">
import type { BattlePlayerRef } from '#shared/types/api'

// Figma "BattlePlayer": Desktop = column header, Compact = mobile column header.
// Empty shows Call bot; Winner = success tint + 1px success stroke.
const props = defineProps<{ player: BattlePlayerRef | null; total?: number; winner?: boolean; lead?: boolean; compact?: boolean; canCallBot?: boolean; canJoin?: boolean; chance?: number }>()
defineEmits<{ bot: []; join: [] }>()

// The running total rolls up to each new value like an odometer
const totalSrc = computed(() => props.total ?? 0)
const totalShown = useTransition(totalSrc, { duration: 700, transition: [0.22, 1, 0.36, 1] })
// the chance to win rolls to each new estimate too
const chanceSrc = computed(() => props.chance ?? 0)
const chanceShown = useTransition(chanceSrc, { duration: 700, transition: [0.22, 1, 0.36, 1] })
</script>

<template>
  <div
    class="kd-slot relative flex items-center"
    :class="[
      compact ? 'flex-col justify-center gap-1 rounded-2xl px-1 py-2 text-center' : 'h-16 gap-3 rounded-2xl px-3',
      winner ? 'is-winner' : lead ? 'is-lead' : '',
    ]"
  >
    <template v-if="player">
      <!-- Winner: burst of sparks and a WINNER tag (Skin.club) -->
      <FxBurst v-if="winner" :tier="3" color="var(--color-success)" :size="compact ? 90 : 160" />
      <span v-if="winner" class="kd-winner-tag type-10-caps absolute -top-2 left-1/2 rounded-sm bg-success px-1.5 py-0.5 text-neutral-1">{{ $t('pvp.winner') }}</span>
      <Transition name="kd-lead">
        <span v-if="lead && !winner" class="kd-lead-tag type-10-caps absolute -top-2 left-1/2 rounded-sm bg-brand-base px-1.5 py-0.5 text-neutral-15">{{ $t('pvp.lead') }}</span>
      </Transition>
      <span class="relative shrink-0">
        <span class="block overflow-hidden rounded-full bg-neutral-7" :class="compact ? 'size-8' : 'size-11'">
          <img :src="player.avatar" alt="" class="size-full object-cover" :class="player.bot && 'scale-75 object-contain'" />
        </span>
      </span>
      <span class="flex min-w-0 flex-col gap-0.5" :class="compact ? 'items-center' : 'flex-1 items-start'">
        <span class="flex max-w-full items-center gap-1.5">
          <UiIcon v-if="winner && !compact" name="crown" :size="16" class="kd-crown shrink-0 text-coin" />
          <span class="truncate" :class="compact ? 'type-12' : 'type-16-medium'">{{ player.you ? $t('pvp.you') : player.nickname }}</span>
          <span v-if="!compact" class="type-12 rounded-xs border border-white-12 bg-[#277cc1] px-1 leading-4">{{ player.level }}</span>
        </span>
        <UiPrice :amount="Math.round(totalShown)" :size="compact ? 'xs' : 'm'" :tone="winner ? 'success' : 'default'" class="tabular-nums" />
      </span>
      <!-- chance to win: the number on the right, a line along the bottom -->
      <span v-if="chance != null" class="kd-chance flex shrink-0 flex-col" :class="compact ? 'items-center pb-1' : 'items-end'">
        <span class="tabular-nums" :class="[compact ? 'type-12' : 'type-20-caps', chanceShown >= 50 ? 'text-success' : chanceShown <= 15 ? 'text-neutral-11' : 'text-neutral-15']">{{ Math.round(chanceShown) }}%</span>
        <span v-if="!compact" class="type-10-caps text-neutral-11">{{ $t('pvp.toWin') }}</span>
      </span>
      <span v-if="chance != null" class="kd-chance-track absolute inset-x-3 bottom-1 h-1 overflow-hidden rounded-full">
        <span class="kd-chance-fill block h-full rounded-full" :style="{ width: `${Math.max(2, chanceShown)}%` }" />
      </span>
    </template>
    <template v-else>
      <span class="grid shrink-0 place-items-center rounded-full border border-dashed border-neutral-8 text-neutral-11" :class="compact ? 'size-8' : 'size-10'">
        <UiIcon name="user" :size="compact ? 16 : 20" />
      </span>
      <span class="flex min-w-0 flex-col" :class="compact ? 'items-center' : 'flex-1'">
        <span class="text-neutral-12" :class="compact ? 'type-12' : 'type-14'">{{ compact ? $t('pvp.free') : $t('pvp.freeSlot') }}</span>
        <span v-if="!compact" class="type-12-regular truncate text-neutral-11">{{ $t('pvp.waitingForPlayer') }}</span>
      </span>
      <UiButton v-if="canJoin" :size="'s'" :icon-only="compact" icon="plus" :aria-label="$t('pvp.join')" @click="$emit('join')">
        <template v-if="!compact">{{ $t('pvp.join') }}</template>
      </UiButton>
      <UiButton v-else-if="canCallBot" variant="secondary" size="s" :icon-only="compact" :icon="compact ? 'plus' : undefined" :aria-label="$t('pvp.callBot')" @click="$emit('bot')">
        <template v-if="!compact">{{ $t('pvp.callBot') }}</template>
      </UiButton>
    </template>
  </div>
</template>

<style scoped>
.kd-slot {
  background: var(--color-neutral-3);
  border: 1px solid transparent;
  transition:
    background-color var(--dur-slow) var(--ease-out),
    border-color var(--dur-slow) var(--ease-out);
}
.kd-chance-track {
  background: var(--color-neutral-4);
}
.kd-chance-fill {
  background: linear-gradient(90deg, var(--color-brand-base), #ffb13b);
}
.kd-slot.is-winner .kd-chance-fill {
  background: var(--color-success);
}
.kd-slot.is-lead {
  border-color: rgb(255 95 31 / 0.45);
}
.kd-lead-tag {
  transform: translateX(-50%);
}
.kd-lead-enter-active,
.kd-lead-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    translate var(--dur-slow) var(--ease-spring);
}
.kd-lead-enter-from,
.kd-lead-leave-to {
  opacity: 0;
  translate: 0 6px;
}
.kd-slot.is-winner {
  background: var(--color-success-24);
  border-color: transparent;
  animation: kd-winner 900ms var(--ease-spring);
}
/* Crown drops in big and settles next to the name (Skin.club "show-crown") */
.kd-crown {
  animation: kd-crown-in 1.1s var(--ease-spring) both;
}
@keyframes kd-crown-in {
  0% {
    opacity: 0;
    transform: translateY(-14px) scale(3);
  }
  45% {
    opacity: 1;
    transform: translateY(-6px) scale(2.2) rotateY(360deg);
  }
  100% {
    transform: none;
  }
}
.kd-winner-tag {
  transform: translateX(-50%);
  animation: kd-tag-in 600ms var(--ease-spring) 200ms both;
}
@keyframes kd-tag-in {
  from {
    opacity: 0;
    transform: translate(-50%, 6px) scale(0.6);
  }
}
@keyframes kd-winner {
  40% {
    transform: scale(1.04);
  }
}
</style>
