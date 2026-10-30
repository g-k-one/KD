<script setup lang="ts">
import type { BattlePlayerRef } from '#shared/types/api'

// Figma "BattlePlayer": Desktop = column header, Compact = mobile column header.
// Empty shows Call bot; Winner = success tint + 1px success stroke.
// Who sits on the left, the name over the coins so far (no coin with a 0 before anything has dropped); on the right, away
// from the name and big: the chance to win, WON / LOST at the end. Whoever is ahead gets a crown on the avatar, a green
// plate and a green chance, every seat of a leading team alike: green is the leader's alone, one signal for who is ahead. The level stands after the name. Phones: one column, the same three lines
// on every seat (the picture with the level small on its top right corner, the name, the chance), an even 8 px between
// them and 12 from the top and
// the bottom; a free seat is its plus in the middle and Join across the bottom, 8 px from the three edges around it.
// Desktop: the 44 px avatar stands as far from the left edge as from the top and the bottom.
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
      compact ? ['flex-col justify-center rounded-2xl text-center', player ? 'gap-2 px-1 py-3' : 'gap-1 p-2'] : 'h-16 gap-3 rounded-5xl pr-3 pl-[9px]',
      winner ? 'is-winner' : lead ? 'is-lead' : '',
    ]"
  >
    <template v-if="player">
      <!-- Winner: a burst of sparks; the plate and WON say the rest -->
      <FxBurst v-if="celebrate" :tier="3" color="var(--color-success)" :size="compact ? 90 : 160" />
      <span class="relative shrink-0">
        <span class="block overflow-hidden rounded-full bg-neutral-7" :class="compact ? 'size-8' : 'size-11'">
          <img :src="player.avatar" alt="" class="size-full object-cover" :class="player.bot && 'scale-75 object-contain'" />
        </span>
        <span v-if="compact" class="absolute -top-1.5 -right-2.5 flex origin-top-right scale-75"><UiLevelBadge :level="player.level" /></span>
        <Transition name="kd-lead">
          <span v-if="compact ? lead || winner : lead && !winner" class="kd-lead-crown absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full text-coin"><UiIcon name="crown-fill" :size="14" /></span>
        </Transition>
      </span>
      <span class="flex min-w-0 max-w-full flex-col" :class="compact ? 'items-center gap-2' : 'flex-1 items-start gap-0.5'">
        <span class="flex min-w-0 max-w-full items-center gap-1.5">
          <UiIcon v-if="winner && !compact" name="crown" :size="16" class="kd-crown shrink-0 text-coin" />
          <span class="min-w-0 max-w-full truncate" :class="compact ? 'type-12' : 'type-16-medium'">{{ player.you ? $t('pvp.you') : player.nickname }}</span>
          <UiLevelBadge v-if="!compact" :level="player.level" class="shrink-0" />
        </span>
        <UiPrice v-if="result || playing" :amount="Math.round(totalShown)" :size="compact ? 'xs' : 'm'" :tone="winner ? 'success' : result ? 'default' : 'coin'" class="tabular-nums" />
      </span>
      <!-- the chance to win, from the first second to the last round -->
      <span v-if="!result && chance != null" class="flex shrink-0 flex-col" :class="compact ? 'items-center' : 'items-end pl-1'">
        <span class="tabular-nums" :class="[compact ? 'type-14' : 'type-20-caps', lead ? 'text-success' : chanceShown <= 15 ? 'text-neutral-11' : 'text-neutral-15']">{{ Math.round(chanceShown) }}%</span>
        <span v-if="!compact" class="type-10-caps whitespace-nowrap text-neutral-11">{{ $t('pvp.toWin') }}</span>
      </span>
      <!-- once it is over: what happened, not a 100% / 0% -->
      <span v-if="result" class="flex shrink-0 flex-col" :class="compact ? 'items-center' : 'items-end'">
        <span :class="[compact ? 'type-12-caps' : 'type-20-caps', result === 'won' ? 'text-success' : 'text-neutral-11']">{{ result === 'won' ? $t('pvp.won') : $t('pvp.lost') }}</span>
      </span>
    </template>
    <template v-else>
      <span class="grid place-items-center" :class="compact && 'flex-1'">
        <span class="grid shrink-0 place-items-center rounded-full border border-dashed border-neutral-8 text-neutral-11" :class="compact ? 'size-8' : 'size-11'">
          <UiIcon name="plus" :size="compact ? 16 : 20" />
        </span>
      </span>
      <span v-if="!compact" class="flex min-w-0 flex-1 flex-col">
        <span class="type-14 text-neutral-12">{{ $t('pvp.freeSlot') }}</span>
        <span class="type-12-regular truncate text-neutral-11">{{ $t('pvp.waitingForPlayer') }}</span>
      </span>
      <UiButton v-if="canJoin" size="s" :block="compact" :loading="busy" @click="$emit('join')">{{ $t('pvp.join') }}</UiButton>
      <UiButton v-else-if="canCallBot" variant="secondary" size="s" :block="compact" :loading="busy" @click="$emit('bot')">{{ $t('pvp.callBot') }}</UiButton>
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
/* the green plate of the seat ahead: a layer that fades, a gradient itself cannot */
.kd-slot::before {
  content: '';
  position: absolute;
  inset: -1px;
  z-index: -1;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(18 183 106 / 0.26), rgb(18 183 106 / 0.05) 70%);
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
@keyframes kd-winner {
  40% {
    transform: scale(1.04);
  }
}
</style>
