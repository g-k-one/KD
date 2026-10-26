<script setup lang="ts">
import type { DailyStep, RankStep } from '#shared/types/api'

/*
 * The ranks, as a ladder: each step is a rank — its name, from which level, the rakeback it gives and its daily case
 * (the best skin in it and what it is worth). Passed ranks are quiet with a check, the player's rank is lit, the next
 * ones are locked. A guest sees it too, standing on the first step. Tapping a step emits `pick` (Bonuses shows that
 * rank's daily case).
 */
const props = defineProps<{ ladder: Array<Omit<DailyStep, 'items'>>; ranks: RankStep[]; tier: number }>()
defineEmits<{ pick: [tier: number] }>()
const steps = computed(() => props.ladder.map((st) => ({ ...st, rank: props.ranks[st.tier] })))
const pct = (bp: number) => `${+(bp / 100).toFixed(1)}%`
</script>

<template>
  <ol class="grid grid-cols-3 gap-2 lg:grid-cols-6">
    <li v-for="st in steps" :key="st.tier" class="flex min-w-0">
      <button
        type="button"
        class="kd-step kd-press relative flex w-full min-w-0 flex-col items-center gap-1 rounded-2xl px-1.5 pt-1.5 pb-2 text-center"
        :class="st.tier === tier ? 'is-now' : st.tier < tier ? 'is-done' : 'is-locked'"
        @click="$emit('pick', st.tier)"
      >
        <ItemArt :image="st.best.image" :rarity="st.best.rarity" :size="40" class="w-full" :dim="st.tier > tier" />
        <span class="type-12-caps max-w-full truncate">{{ st.rank?.name }}</span>
        <span class="type-10-caps text-neutral-11">{{ $t('bonus.fromLvl', { n: st.fromLevel }) }}</span>
        <!-- what the rank gives: rakeback and the daily case's worth -->
        <span class="type-12 text-success tabular-nums">{{ $t('bonus.rakebackShort', { pct: pct(st.rank?.rakebackBp ?? 0) }) }}</span>
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
