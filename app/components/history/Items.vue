<script setup lang="ts">
import type { HistoryEntry } from '#shared/types/api'

/*
 * What went in and what came out of a history row: an upgrade's skins (and coins) → its target, a case → its drop.
 * Shared by the profile's game history and the Provably Fair page's rolls, so a row reads the same on both.
 * Phones show the result alone.
 */
defineProps<{ entry: HistoryEntry }>()
</script>

<template>
  <span class="flex items-center gap-1.5">
    <template v-if="entry.stake?.length || entry.stakeCoins">
      <span class="flex items-center -space-x-3 max-lg:hidden">
        <span v-for="(s, k) in (entry.stake ?? []).slice(0, 3)" :key="k" class="kd-hthumb" :style="{ '--rc': RARITY_COLOR[s.rarity] }" :title="s.name">
          <ItemArt :image="s.image" :rarity="s.rarity" :size="24" class="w-10" />
        </span>
        <span v-if="entry.stakeCoins" class="kd-hthumb grid place-items-center"><UiCoin :size="18" /></span>
      </span>
      <UiIcon name="chevron-right" :size="16" class="text-neutral-9 max-lg:hidden" />
    </template>
    <span v-if="entry.result" class="kd-hthumb" :class="entry.status === 'lost' && entry.game === 'upgrade' && 'is-lost'" :style="{ '--rc': RARITY_COLOR[entry.result.rarity] }" :title="entry.result.name">
      <ItemArt :image="entry.result.image" :rarity="entry.result.rarity" :size="24" class="w-10" />
    </span>
  </span>
</template>

<style scoped>
/* a skin in a row: a small tile tinted by its rarity; an upgrade's target that was missed is dimmed */
.kd-hthumb {
  display: grid;
  width: 44px;
  height: 36px;
  place-items: center;
  border-radius: 10px;
  background: color-mix(in srgb, var(--rc, var(--color-neutral-6)) 18%, var(--color-neutral-3));
  box-shadow: 0 0 0 2px var(--color-neutral-2);
}
.kd-hthumb.is-lost {
  opacity: 0.45;
  filter: grayscale(0.7);
}
</style>
