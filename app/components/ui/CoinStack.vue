<script setup lang="ts">
/*
 * Balance coins as a piece of the stake, drawn as a skin is: ItemArt with the gold rarity, one picture per order of
 * the amount — a coin (under 10), a pile (under 100), a sack (under 1 000), crates (under 10 000), a van (under
 * 100 000), a container (beyond). Same morph as the skins (the new picture flows in over the old one, no gap), the
 * same float on big cards. All six are preloaded so a tier change never waits for the network. Size is the old coin
 * diameter: the art is 1.56× it, so 96 lands on the 150 a big skin uses.
 */
const props = withDefaults(defineProps<{ size?: number; amount?: number }>(), { size: 40 })

const TIERS = ['coin', 'pile', 'sack', 'crates', 'van', 'container'] as const
const src = (t: (typeof TIERS)[number]) => `/img/coins/${t}.webp`
const tier = computed(() => {
  const coins = Math.max(0, (props.amount ?? 0) / 100)
  return TIERS[Math.min(TIERS.length - 1, Math.max(0, Math.floor(Math.log10(Math.max(1, coins)))))]!
})
const art = computed(() => Math.round(props.size * 1.56))

onMounted(() => {
  for (const t of TIERS) new Image().src = src(t)
})
</script>

<template>
  <ItemArt morph :float="size >= 60" :image="src(tier)" rarity="gold" :size="art" :style="{ width: `${Math.round(art * 1.73)}px` }" />
</template>
