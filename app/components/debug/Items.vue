<script setup lang="ts">
import type { BattlesResponse, CasesResponse, Item, MarketResponse, Rarity } from '#shared/types/api'

// Debug → items & cards: ItemArt with every knob, the tile / drop card states, case and PvP cards on live mock data.
const { data: market } = useFetch<MarketResponse>('/api/market', { key: 'dbg-market', server: false })
const { data: cases } = useFetch<CasesResponse>('/api/cases', { key: 'dbg-cases', server: false })
const { data: battles } = useFetch<BattlesResponse>('/api/battles', { key: 'dbg-battles', server: false })
// one waiting battle, cut and stretched to 1–9 rounds (its own cases, cycled), to see how the card lays them out
const roundsDemo = computed(() => {
  const b = battles.value?.battles.find((x) => x.status === 'waiting')
  if (!b) return []
  const pool = (battles.value?.battles ?? []).flatMap((x) => x.rounds)
  return [1, 2, 3, 5, 6, 9].map((n) => ({ ...b, id: `${b.id}-${n}`, rounds: Array.from({ length: n }, (_, i) => pool[i % pool.length]!) }))
})

const art = reactive({ rarity: 'covert' as Rarity, size: 120, float: true, morph: false, dim: false, statTrak: false })
const replay = ref(0)
const reveal = ref(0)
// One item per rarity, so the playground and the grids show the real art of each band
const byRarity = computed(() => {
  const out = {} as Record<Rarity, Item | undefined>
  for (const r of RARITIES) out[r] = market.value?.items.find((i) => i.rarity === r)
  return out
})
const item = computed<Item | undefined>(() => {
  const it = byRarity.value[art.rarity]
  return it ? { ...it, statTrak: art.statTrak } : undefined
})
// the rank plays on layers behind the arts, as in the product
const artFx = useTemplateRef<HTMLElement>('artFx')
const fx = useForge(artFx)
const ladderFx = useTemplateRef<HTMLElement>('ladderFx')
const fxLadder = useForge(ladderFx)
const artBox = useTemplateRef<HTMLElement>('artBox')
function doReveal(tier = RARITY_TIER[art.rarity] || 1) {
  reveal.value = 0
  replay.value++
  nextTick(() => {
    reveal.value = tier
    rarityRank(fx, artBox.value?.querySelector<HTMLElement>('.kd-art img'), art.rarity, 1.3)
  })
}
// The rank ladder: the six rarities side by side, each landing in turn, to compare the steps
const ladder = useTemplateRef<HTMLElement>('ladder')
const ladderReveal = ref<Partial<Record<Rarity, number>>>({})
const ladderKey = ref(0)
async function playLadder() {
  ladderReveal.value = {}
  ladderKey.value++
  await nextTick()
  for (const r of RARITIES) {
    ladderReveal.value = { ...ladderReveal.value, [r]: RARITY_TIER[r] || 1 }
    rarityRank(fxLadder, ladder.value?.querySelector<HTMLElement>(`[data-r="${r}"] .kd-art img`), r, 1.3)
    await new Promise((res) => setTimeout(res, 900))
  }
}
const caseList = computed(() => (cases.value?.sections ?? []).flatMap((s) => s.cases).slice(0, 8))
const sel = ref(new Set<number>())
const flash = ref(true)
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="dbg-card">
      <h2 class="dbg-h">Item art <span class="dbg-note">ItemArt</span></h2>
      <div class="dbg-play">
        <div ref="artBox" class="relative grid min-h-64 flex-1 place-items-center overflow-hidden rounded-2xl bg-neutral-1 p-6">
          <div ref="artFx" class="pointer-events-none absolute inset-0" />
          <ItemArt v-if="item" :key="replay" :image="item.image" :rarity="art.rarity" :size="art.size" :float="art.float" :morph="art.morph" :dim="art.dim" :reveal="reveal" class="w-full max-w-80" />
        </div>
        <div class="dbg-knobs">
          <div class="flex flex-wrap gap-1.5">
            <button v-for="r in RARITIES" :key="r" type="button" class="kd-press type-12-caps h-8 rounded-md px-3 text-neutral-1" :class="art.rarity === r && 'ring-2 ring-neutral-15'" :style="{ background: RARITY_COLOR[r] }" @click="art.rarity = r">{{ r }}</button>
          </div>
          <UiSlider v-model="art.size" :min="32" :max="200" label="Size" />
          <div class="flex flex-wrap gap-3">
            <UiToggle v-model="art.float" label="Float" />
            <UiToggle v-model="art.morph" label="Morph" />
            <UiToggle v-model="art.dim" label="Dim" />
            <UiToggle v-model="art.statTrak" label="StatTrak" />
          </div>
          <div class="flex flex-wrap gap-2">
            <UiButton size="s" icon="sparkle" @click="doReveal()">Reveal (its tier)</UiButton>
            <UiButton v-for="t in [1, 2, 3, 4]" :key="t" size="s" variant="secondary" @click="doReveal(t)">Tier {{ t }}</UiButton>
          </div>
        </div>
      </div>
    </section>

    <section class="dbg-card">
      <h2 class="dbg-h">Rank reveal <span class="dbg-note">Forge tier split over the rarities</span></h2>
      <div ref="ladder" class="relative grid grid-cols-3 gap-2 rounded-2xl bg-neutral-1 lg:grid-cols-6">
        <div ref="ladderFx" class="pointer-events-none absolute inset-0" />
        <div v-for="r in RARITIES" :key="`${r}-${ladderKey}`" :data-r="r" class="relative flex flex-col items-center gap-2 py-6">
          <ItemArt v-if="byRarity[r]" :image="byRarity[r]!.image" :rarity="r" :size="88" float :reveal="ladderReveal[r] ?? 0" class="w-full" />
          <span class="type-12-caps" :style="{ color: RARITY_COLOR[r] }">{{ r }} · {{ RANK_LEVEL[r] }}</span>
        </div>
      </div>
      <UiButton size="s" icon="sparkle" class="self-start" @click="playLadder">Play the ladder</UiButton>
    </section>

    <section class="dbg-card">
      <h2 class="dbg-h">Item tile <span class="dbg-note">ItemTile · tap to select</span></h2>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <ItemTile v-for="(r, i) in RARITIES" :key="r" :item="byRarity[r]" :selected="sel.has(i)" @toggle="sel.has(i) ? sel.delete(i) : sel.add(i)" />
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <div class="flex flex-col gap-1"><ItemTile :item="byRarity.covert" selected /><span class="dbg-note">selected</span></div>
        <div class="flex flex-col gap-1"><ItemTile :item="byRarity.covert" disabled hint="Pricier than the target" /><span class="dbg-note">disabled + hint</span></div>
        <div class="flex flex-col gap-1"><ItemTile :item="byRarity.classified" near /><span class="dbg-note">near</span></div>
        <div class="flex flex-col gap-1"><ItemTile :item="byRarity.gold" readonly /><span class="dbg-note">readonly</span></div>
        <div class="flex flex-col gap-1"><ItemTile :item="byRarity.restricted ? { ...byRarity.restricted, statTrak: true } : undefined" /><span class="dbg-note">StatTrak</span></div>
        <div class="flex flex-col gap-1"><ItemTile /><span class="dbg-note">empty</span></div>
      </div>
    </section>

    <section class="dbg-card">
      <h2 class="dbg-h">Drop card <span class="dbg-note">ItemDropCard · case contents</span></h2>
      <UiToggle v-model="flash" label="Flashlight (drops today)" />
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <template v-for="(r, i) in RARITIES" :key="r">
          <ItemDropCard v-if="byRarity[r]" :item="byRarity[r]!" :chance="['42.10', '18.00', '8.50', '3.20', '0.64', '0.26', '0.05'][i]" :range="[i * 1000 + 1, i * 1000 + 900]" :drops="(7 - i) * 13" :flash="flash && i === 4" />
        </template>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <template v-for="r in RARITIES" :key="r">
          <ItemDropCard v-if="byRarity[r]" :item="byRarity[r]!" compact chance="1.00" />
        </template>
      </div>
    </section>

    <section class="dbg-card">
      <h2 class="dbg-h">Case card <span class="dbg-note">HomeCaseCard</span></h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HomeCaseCard v-for="c in caseList" :key="c.slug" :item="c" />
      </div>
    </section>

    <section class="dbg-card">
      <h2 class="dbg-h">PvP table <span class="dbg-note">PvpTable · the same battle with 1, 2, 3, 5, 6 and 9 rounds</span></h2>
      <PvpTable :battles="roundsDemo" />
    </section>

    <section class="dbg-card">
      <h2 class="dbg-h">Big wins <span class="dbg-note">HomeBigWins</span></h2>
      <HomeBigWins />
    </section>
  </div>
</template>
