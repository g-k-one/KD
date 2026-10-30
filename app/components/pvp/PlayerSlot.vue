<script setup lang="ts">
import type { BattlePlayerRef } from '#shared/types/api'

// Figma "BattlePlayer": Desktop = column header, Compact = mobile column header.
// Empty shows Call bot; Winner = success tint + 1px success stroke.
// Who sits on the left, the name over the coins so far (no coin with a 0 before anything has dropped); on the right, away
// from the name and big: the chance to win, WON / LOST at the end. Whoever is ahead gets a crown on the avatar and a warm
// plate, every seat of a leading team alike. The level sits on the avatar's corner. Phones: one column, the same three
// lines on every seat (the picture, the name, a 32 px line with the chance or Join), so a free seat reads like a taken one.
const props = defineProps<{ player: BattlePlayerRef | null; total?: number; winner?: boolean; lead?: boolean; compact?: boolean; canCallBot?: boolean; canJoin?: boolean; chance?: number; result?: 'won' | 'lost'; busy?: boolean }>()
defineEmits<{ bot: []; join: [] }>()

// The running total rolls up to each new value like an odometer
const totalSrc = computed(() => props.total ?? 0)
const totalShown = useTransition(totalSrc, { duration: 700, transition: [0.22, 1, 0.36, 1] })
// the chance to win rolls to each new estimate too
const chanceSrc = computed(() => props.chance ?? 0)
const chanceShown = useTransition(chanceSrc, { duration: 700, transition: [0.22, 1, 0.36, 1] })
const playing = computed(() => (props.total ?? 0) > 0)
// Sparks only at the moment the seat wins, not for a battle that was already over when the page opened
const celebrate = ref(false)
watch(() => props.winner, (v, was) => (celebrate.value = !!v && was === false))
</script>

<template>
  <div
    class="kd-slot relative flex items-center"
    :class="[
      compact ? 'flex-col justify-center gap-1 rounded-2xl px-1 py-2 text-center' : 'h-16 gap-4 rounded-5xl px-3',
      winner ? 'is-winner' : lead ? 'is-lead' : '',
    ]"
  >
    <template v-if="player">
      <!-- Winner: burst of sparks and a WINNER tag (Skin.club) -->
      <FxBurst v-if="celebrate" :tier="3" color="var(--color-success)" :size="compact ? 90 : 160" />
      <span v-if="winner" class="kd-winner-tag type-10-caps absolute -top-2 left-1/2 rounded-sm bg-success px-1.5 py-0.5 text-neutral-1">{{ $t('pvp.winner') }}</span>
      <span class="relative shrink-0">
        <span class="block overflow-hidden rounded-full bg-neutral-7" :class="compact ? 'size-8' : 'size-11'">
          <img :src="player.avatar" alt="" class="size-full object-cover" :class="player.bot && 'scale-75 object-contain'" />
        </span>
        <span class="absolute -right-2 -bottom-1.5 flex" :class="compact && 'origin-bottom-right scale-85'"><UiLevelBadge :level="player.level" /></span>
        <Transition name="kd-lead">
          <span v-if="lead && !winner" class="kd-lead-crown absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full text-coin"><UiIcon name="crown-fill" :size="14" /></span>
        </Transition>
      </span>
      <span class="flex min-w-0 max-w-full flex-col gap-0.5" :class="compact ? 'items-center' : 'flex-1 items-start'">
        <span class="flex min-w-0 max-w-full items-center gap-1.5">
          <UiIcon v-if="winner && !compact" name="crown" :size="16" class="kd-crown shrink-0 text-coin" />
          <span class="min-w-0 max-w-full truncate" :class="compact ? 'type-12' : 'type-16-medium'">{{ player.you ? $t('pvp.you') : player.nickname }}</span>
        </span>
        <UiPrice v-if="result || playing" :amount="Math.round(totalShown)" :size="compact ? 'xs' : 'm'" :tone="winner ? 'success' : result ? 'default' : 'coin'" class="tabular-nums" />
      </span>
      <!-- the chance to win, from the first second to the last round -->
      <span v-if="!result && chance != null" class="flex shrink-0 flex-col" :class="compact ? 'h-8 items-center justify-center' : 'items-end pl-3'">
        <span class="tabular-nums" :class="[compact ? 'type-14' : 'type-20-caps', chanceShown >= 50 ? 'text-success' : chanceShown <= 15 ? 'text-neutral-11' : 'text-neutral-15']">{{ Math.round(chanceShown) }}%</span>
        <span v-if="!compact" class="type-10-caps whitespace-nowrap text-neutral-11">{{ $t('pvp.toWin') }}</span>
      </span>
      <!-- once it is over: what happened, not a 100% / 0% -->
      <span v-if="result" class="flex shrink-0 flex-col" :class="compact ? 'h-8 items-center justify-center' : 'items-end'">
        <span :class="[compact ? 'type-12-caps' : 'type-20-caps', result === 'won' ? 'text-success' : 'text-neutral-11']">{{ result === 'won' ? $t('pvp.won') : $t('pvp.lost') }}</span>
      </span>
    </template>
    <template v-else>
      <span class="grid shrink-0 place-items-center rounded-full border border-dashed border-neutral-8 text-neutral-11" :class="compact ? 'size-8' : 'size-10'">
        <UiIcon name="plus" :size="compact ? 16 : 20" />
      </span>
      <span class="flex min-w-0 flex-col" :class="compact ? 'items-center' : 'flex-1'">
        <span class="text-neutral-12" :class="compact ? 'type-12' : 'type-14'">{{ compact ? $t('pvp.free') : $t('pvp.freeSlot') }}</span>
        <span v-if="!compact" class="type-12-regular truncate text-neutral-11">{{ $t('pvp.waitingForPlayer') }}</span>
      </span>
      <UiButton v-if="canJoin" size="s" :block="compact" :loading="busy" @click="$emit('join')">{{ $t('pvp.join') }}</UiButton>
      <UiButton v-else-if="canCallBot" variant="secondary" size="s" :block="compact" :loading="busy" @click="$emit('bot')">{{ $t('pvp.callBot') }}</UiButton>
      <span v-else-if="compact" class="h-8" aria-hidden="true" />
    </template>
  </div>
</template>

<style scoped>
.kd-slot {
  isolation: isolate;
  background: var(--color-neutral-3);
  border: 1px solid transparent;
  transition:
    background-color var(--dur-slow) var(--ease-out),
    border-color var(--dur-slow) var(--ease-out);
}
/* the warm plate of the seat ahead: a layer that fades, a gradient itself cannot */
.kd-slot::before {
  content: '';
  position: absolute;
  inset: -1px;
  z-index: -1;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(255 95 31 / 0.28), rgb(255 95 31 / 0.04) 70%);
  opacity: 0;
  transition: opacity var(--dur-slow) var(--ease-out);
}
.kd-slot.is-lead::before {
  opacity: 1;
}
.kd-lead-crown {
  background: var(--color-neutral-1);
  box-shadow: 0 0 0 1px rgb(255 178 42 / 0.4);
}
.kd-lead-enter-active,
.kd-lead-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    scale var(--dur-slow) var(--ease-spring);
}
.kd-lead-enter-from,
.kd-lead-leave-to {
  opacity: 0;
  scale: 0.4;
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
