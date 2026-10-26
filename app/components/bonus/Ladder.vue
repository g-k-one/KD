<script setup lang="ts">
import type { DailyStep } from '#shared/types/api'

/*
 * What levels give, as a ladder of the daily case's tiers: each step shows its best skin, from which level and what
 * the case is worth there. Passed steps are quiet with a check, the player's step is lit, the next ones are locked.
 * A guest sees it too, standing on the first step. Tapping a step emits `pick` (Bonuses shows that tier's contents).
 */
defineProps<{ ladder: Array<Omit<DailyStep, 'items'>>; tier: number }>()
defineEmits<{ pick: [tier: number] }>()
const tierNames = ['I', 'II', 'III', 'IV']
</script>

<template>
  <ol class="grid grid-cols-4 gap-2">
    <li v-for="st in ladder" :key="st.tier" class="flex min-w-0">
      <button
        type="button"
        class="kd-step kd-press relative flex w-full min-w-0 flex-col items-center gap-1 rounded-2xl px-1.5 pt-1.5 pb-2 text-center"
        :class="st.tier === tier ? 'is-now' : st.tier < tier ? 'is-done' : 'is-locked'"
        :style="{ '--rc': RARITY_COLOR[st.best.rarity] }"
        @click="$emit('pick', st.tier)"
      >
        <ItemArt :image="st.best.image" :rarity="st.best.rarity" :size="40" class="w-full" :dim="st.tier > tier" />
        <span class="type-12-caps">{{ $t('bonus.tier', { tier: tierNames[st.tier] }) }}</span>
        <span class="type-10-caps text-neutral-11">{{ $t('bonus.fromLvl', { n: st.fromLevel }) }}</span>
        <!-- the tier's worth: it grows step by step (the best skins don't, tier to tier) -->
        <UiPrice :amount="st.value" size="xs" />
        <UiIcon v-if="st.tier < tier" name="check-circle" :size="14" class="absolute top-1.5 right-1.5 text-success" />
        <UiIcon v-else-if="st.tier > tier" name="lock" :size="14" class="absolute top-1.5 right-1.5 text-neutral-11" />
      </button>
    </li>
  </ol>
</template>

<style scoped>
.kd-step {
  background: var(--color-neutral-3);
}
.kd-step.is-now {
  background: color-mix(in srgb, var(--color-brand-base) 14%, var(--color-neutral-3));
  box-shadow: inset 0 0 0 1.5px var(--color-brand-base);
}
.kd-step.is-locked {
  opacity: 0.6;
}
</style>
