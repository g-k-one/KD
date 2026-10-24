<script setup lang="ts">
/*
 * Balance coins as a piece of the stake, drawn as a skin is: ItemArt with the gold rarity, one picture of our coin
 * per step of the amount, about ×2.5 apart so it changes often — a coin, a stack, a heap, a mound, a sack, a CS2-style case,
 * crates, a pallet, a van, a sea container. Same morph as the skins (the new picture flows in over the old one, no
 * gap), the same float on big cards. The tiers next to the current one are preloaded, so a step never waits for the
 * network and a page does not pull all ten. Size is the old
 * coin diameter: the art is 1.56× it, so 96 lands on the 150 a big skin uses.
 */
const props = withDefaults(defineProps<{ size?: number; amount?: number }>(), { size: 40 })

/** Each tier holds amounts below its `under` (in coins); the last one has no ceiling */
const TIERS = [
  { name: 'coin', under: 5 },
  { name: 'stack', under: 15 },
  { name: 'heap', under: 40 },
  { name: 'mound', under: 100 },
  { name: 'sack', under: 250 },
  { name: 'case', under: 600 },
  { name: 'crates', under: 1500 },
  { name: 'pallet', under: 4000 },
  { name: 'van', under: 10000 },
  { name: 'container', under: Infinity },
] as const
const src = (name: string) => `/img/coins/${name}.webp`
const tier = computed(() => {
  const coins = Math.max(0, (props.amount ?? 0) / 100)
  return TIERS.find((t) => coins < t.under)!.name
})
const art = computed(() => Math.round(props.size * 1.56))

const warmed = new Set<string>()
watch(
  tier,
  (name) => {
    if (import.meta.server) return
    const i = TIERS.findIndex((t) => t.name === name)
    for (const t of TIERS.slice(Math.max(0, i - 1), i + 2)) {
      if (warmed.has(t.name)) continue
      warmed.add(t.name)
      new Image().src = src(t.name)
    }
  },
  { immediate: true },
)
</script>

<template>
  <ItemArt morph :float="size >= 60" :image="src(tier)" rarity="gold" :size="art" :style="{ width: `${Math.round(art * 1.73)}px` }" />
</template>
