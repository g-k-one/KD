<script setup lang="ts">
import type { InventoryItem } from '#shared/types/api'

// One skin about to leave (Withdraw, Sell): big and alive, what it is. Its price is on the button under it
defineProps<{ item: InventoryItem }>()
</script>

<template>
  <div class="flex flex-col items-center gap-1 text-center">
    <ItemArt float :image="item.image" :rarity="item.rarity" :size="128" class="h-44 w-full" />
    <span class="type-12-caps text-neutral-11"><span v-if="item.statTrak" class="text-brand-light">ST </span>{{ item.wear }} · {{ item.weapon }}</span>
    <span class="type-16-medium" :style="{ color: RARITY_COLOR[item.rarity] }">{{ item.skin }}</span>
  </div>
</template>
