<script setup lang="ts">
import type { BattlePlayerRef } from '#shared/types/api'

// Figma "BattlePlayer": Desktop = column header, Compact = mobile column header.
// Empty shows Call bot; Winner = success tint + 1px success stroke.
// Who sits on the left, the name over the coins so far (no coin with a 0 before anything has dropped); on the right, away
// from the name and big: the chance to win, WON / LOST at the end. Whoever is ahead gets a green plate and a green chance,
// every seat of a leading team alike: one signal for who is ahead. The crown is the winner's: on the avatar's corner. The level stands after the name. Phones: one column, the same three lines
// on every seat (the picture with the level small on its top right corner, the name, then the coins and the chance on the
// line of a free seat's button), 8 px in from the edges; a free seat is its plus in the picture's place and Join at the bottom.
// Desktop: the 44 px avatar stands as far from the left edge as from the top and the bottom.
// quiet: a seat inside a team: the team's head says the chance, who leads and who won, the seat only who sits there
const props = defineProps<{ player: BattlePlayerRef | null; total?: number; winner?: boolean; lead?: boolean; compact?: boolean; canCallBot?: boolean; canJoin?: boolean; chance?: number; result?: 'won' | 'lost'; busy?: boolean; quiet?: boolean; canKick?: boolean; canLeave?: boolean }>()
defineEmits<{ bot: []; join: []; kick: []; leave: [] }>()

// The running total rolls up to each new value like an odometer
const totalSrc = computed(() => props.total ?? 0)
const totalShown = useTransition(totalSrc, { duration: 700, transition: [0.22, 1, 0.36, 1] })
// the chance to win rolls to each new estimate too
const chanceSrc = computed(() => props.chance ?? 0)
const chanceShown = useTransition(chanceSrc, { duration: 700, transition: [0.22, 1, 0.36, 1] })
const playing = computed(() => (props.total ?? 0) > 0)
// nothing dropped yet: no coins line, so the rest stands in the plate's middle and makes room as the line fades in
const idle = computed(() => !(props.result || playing.value))
</script>

<template>
  <div
    class="kd-slot relative flex items-center"
    :class="[
      compact ? 'h-[118px] flex-col gap-1 rounded-2xl p-2 text-center' : ['h-16 gap-3 rounded-2xl pl-[9px]', player && !canKick && !canLeave ? 'pr-3' : 'pr-[15px]'],
      quiet ? '' : winner ? 'is-winner' : lead ? 'is-lead' : '',
      compact && 'is-compact',
      idle && 'is-idle',
    ]"
  >
    <template v-if="player">
      <span class="kd-slot-pic relative shrink-0">
        <span class="block overflow-hidden rounded-full bg-neutral-7" :class="compact ? 'size-8' : 'size-11'">
          <img :src="player.avatar" alt="" class="size-full object-cover" :class="player.bot && 'scale-75 object-contain'" />
        </span>
        <span v-if="compact" class="absolute -top-1.5 -right-2.5 flex origin-top-right scale-75"><UiLevelBadge :level="player.level" /></span>
        <span v-if="winner && !quiet" class="kd-crown absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full text-success"><UiIcon name="crown-fill" :size="14" /></span>
      </span>
      <span class="kd-slot-who flex min-w-0 max-w-full flex-col" :class="compact ? 'items-center' : 'flex-1 items-start gap-0.5'">
        <span class="flex min-w-0 max-w-full items-center gap-1.5">
          <span class="min-w-0 max-w-full truncate" :class="compact ? 'type-12' : 'type-16-medium'">{{ player.you ? $t('pvp.you') : player.nickname }}</span>
          <UiLevelBadge v-if="!compact" :level="player.level" class="shrink-0" />
        </span>
        <!-- the line is kept from the start and only fades in, so the plate's height never changes -->
        <UiPrice v-if="!compact" :amount="Math.round(totalShown)" size="m" :tone="winner ? 'default' : result ? 'muted' : 'coin'" class="tabular-nums transition-opacity duration-300" :class="idle && 'opacity-0'" />
      </span>
      <!-- the chance to win, from the first second to the last round -->
      <span v-if="!compact && !quiet && !result && chance != null" class="kd-slot-odds flex shrink-0 flex-col items-end gap-1 pl-1">
        <span class="type-20-caps tabular-nums" :class="lead ? 'text-success' : chanceShown <= 15 ? 'text-neutral-11' : 'text-neutral-15'">{{ Math.round(chanceShown) }}%</span>
        <span class="type-10-caps whitespace-nowrap text-neutral-11">{{ $t('pvp.toWin') }}</span>
      </span>
      <!-- phones, on every seat the same rows: the picture, the name, and at the bottom one thing on one line: before the start
           the seat's button, as a free seat's, then the coins over the chance or the result -->
      <UiButton v-if="compact && (canKick || canLeave)" variant="secondary" size="s" :icon="canLeave ? 'logout' : 'close'" icon-only block class="mt-auto" :title="canLeave ? $t('pvp.leaveBattle') : $t('pvp.kick', { name: player.nickname })" :aria-label="canLeave ? $t('pvp.leaveBattle') : $t('pvp.kick', { name: player.nickname })" @click="canLeave ? $emit('leave') : $emit('kick')" />
      <span v-else-if="compact" class="mt-auto flex flex-col items-center gap-1">
        <UiPrice :amount="Math.round(totalShown)" size="s" :tone="winner ? 'default' : result || idle ? 'muted' : 'coin'" class="tabular-nums" />
        <span v-if="result && !quiet" class="type-12-caps" :class="result === 'won' ? 'text-success' : 'text-neutral-11'">{{ result === 'won' ? $t('pvp.won') : $t('pvp.lost') }}</span>
        <span v-else-if="!quiet && chance != null" class="type-14 tabular-nums" :class="lead ? 'text-success' : chanceShown <= 15 ? 'text-neutral-11' : 'text-neutral-15'">{{ Math.round(chanceShown) }}%</span>
      </span>
      <!-- before the start, the seat's one action as an icon at its end, placed as a free seat's button: 32 px, 16 from the
           plate's top, bottom and right. The creator clears a seat, your own seat is your way out -->
      <UiButton v-if="!compact && (canKick || canLeave)" variant="secondary" size="s" :icon="canLeave ? 'logout' : 'close'" icon-only class="shrink-0" :title="canLeave ? $t('pvp.leaveBattle') : $t('pvp.kick', { name: player.nickname })" :aria-label="canLeave ? $t('pvp.leaveBattle') : $t('pvp.kick', { name: player.nickname })" @click="canLeave ? $emit('leave') : $emit('kick')" />
      <!-- once it is over: what happened, not a 100% / 0% -->
      <span v-if="!compact && result && !quiet" class="flex shrink-0 flex-col items-end gap-1">
        <span class="type-20-caps" :class="result === 'won' ? 'text-success' : 'text-neutral-11'">{{ result === 'won' ? $t('pvp.won') : $t('pvp.lost') }}</span>
        <span class="type-10-caps" :class="result === 'won' ? 'text-success' : 'text-neutral-11'">{{ $t('pvp.result') }}</span>
      </span>
    </template>
    <template v-else>
      <span class="grid place-items-center">
        <span class="grid shrink-0 place-items-center rounded-full border border-dashed border-neutral-8 text-neutral-11" :class="compact ? 'size-8' : 'size-11'">
          <UiIcon name="plus" :size="compact ? 16 : 20" />
        </span>
      </span>
      <span v-if="!compact" class="type-14 min-w-0 flex-1 truncate text-neutral-12">{{ $t('pvp.freeSlot') }}</span>
      <!-- 32 px high, 16 px from the plate's top, bottom and right; wide, so the seat's one action is easy to hit -->
      <UiButton v-if="canJoin" size="s" :block="compact" :class="compact ? 'mt-auto' : 'w-28'" :loading="busy" @click="$emit('join')">{{ $t('pvp.join') }}</UiButton>
      <UiButton v-else-if="canCallBot" variant="secondary" size="s" :block="compact" :class="compact ? 'mt-auto' : 'w-28'" :loading="busy" @click="$emit('bot')">{{ $t(compact ? 'pvp.callBotShort' : 'pvp.callBot') }}</UiButton>
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
/* half of the coins line and its gap */
.kd-slot-who {
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-slot.is-idle:not(.is-compact) .kd-slot-who {
  transform: translateY(11px);
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
.kd-slot.is-winner {
  background: var(--color-success-24);
  border-color: transparent;
  animation: kd-winner 900ms var(--ease-spring);
}
/* the crown drops onto the avatar's corner; a plain fall, so it stays smooth while the whole room changes around it */
.kd-crown {
  background: var(--color-neutral-1);
  box-shadow: 0 0 0 1px rgb(18 183 106 / 0.4);
  animation: kd-crown-in 460ms var(--ease-spring) both;
}
@keyframes kd-crown-in {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(1.5);
  }
}
@keyframes kd-winner {
  40% {
    transform: scale(1.04);
  }
}
</style>
