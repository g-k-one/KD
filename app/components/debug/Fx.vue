<script setup lang="ts">
import type { Rarity } from '#shared/types/api'

// Debug → FX: our kd* Forge effects on one stage (one-shot or loop, with tint and scale), FxFire and FxBurst.
const stage = useTemplateRef<HTMLElement>('stage')
const target = useTemplateRef<HTMLElement>('target')
const fx = useForge(stage)
const names = ref<string[]>([])
const o = reactive({ scale: 1.4, loop: false, tint: 'covert' as Rarity | 'none', soft: false })
onMounted(async () => {
  await fx.preload('aura')
  names.value = (window.Forge?.names ?? []).filter((n) => n.startsWith('kd'))
})
async function play(n: string) {
  const hd = await fx.at(n, target.value, o.scale, o.loop)
  if (o.tint !== 'none') hd?.set('tint', hexToRgb(RARITY_HEX[o.tint]))
  if (o.soft) hd?.set('soft', 1)
}
const fire = ref(true)
const burstKey = ref(0)
const burstTier = ref(3)
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="dbg-card">
      <h2 class="dbg-h">Forge · kd effects <NuxtLink to="/fx" class="dbg-note underline">all stock effects →</NuxtLink></h2>
      <div class="dbg-play">
        <div ref="stage" class="relative grid min-h-72 flex-1 place-items-center overflow-hidden rounded-2xl bg-neutral-1">
          <div ref="target" class="grid size-28 place-items-center rounded-full border border-dashed border-neutral-6 text-neutral-10">
            <UiIcon name="sparkle" :size="28" />
          </div>
        </div>
        <div class="dbg-knobs">
          <UiSlider v-model="o.scale" :min="0.5" :max="3" label="Scale" />
          <div class="flex flex-wrap gap-1.5">
            <button type="button" class="kd-press type-12-caps h-8 rounded-md bg-neutral-4 px-3" :class="o.tint === 'none' && 'ring-2 ring-neutral-15'" @click="o.tint = 'none'">no tint</button>
            <button v-for="r in RARITIES" :key="r" type="button" class="kd-press type-12-caps h-8 rounded-md px-3 text-neutral-1" :class="o.tint === r && 'ring-2 ring-neutral-15'" :style="{ background: RARITY_COLOR[r] }" @click="o.tint = r">{{ r }}</button>
          </div>
          <div class="flex flex-wrap gap-3">
            <UiToggle v-model="o.loop" label="Loop" />
            <UiToggle v-model="o.soft" label="Soft" />
          </div>
          <div class="flex flex-wrap gap-2">
            <UiButton v-for="n in names" :key="n" size="s" variant="secondary" @click="play(n)">{{ n }}</UiButton>
            <UiButton size="s" variant="ghost" icon="close" @click="fx.stopAll()">Stop all</UiButton>
          </div>
        </div>
      </div>
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="dbg-card">
        <h2 class="dbg-h">FxFire</h2>
        <UiToggle v-model="fire" label="On" />
        <div class="flex items-center gap-8 rounded-2xl bg-neutral-1 p-6">
          <FxFire :on="fire"><span class="type-28 relative z-[2] text-brand-light">x281</span></FxFire>
          <FxFire :on="fire" :spread="1.8"><span class="type-20-caps relative z-[2]">spread 1.8</span></FxFire>
        </div>
      </section>
      <section class="dbg-card">
        <h2 class="dbg-h">FxBurst <span class="dbg-note">legacy CSS burst</span></h2>
        <UiSegmented v-model="burstTier" :options="[1, 2, 3, 4].map((t) => ({ value: t, label: `Tier ${t}` }))" size="s" />
        <div class="relative grid h-48 place-items-center overflow-hidden rounded-2xl bg-neutral-1" @click="burstKey++">
          <FxBurst :key="burstKey" :tier="burstTier" :color="RARITY_COLOR.covert" :size="180" />
          <span class="dbg-note relative">tap to replay</span>
        </div>
      </section>
    </div>
  </div>
</template>
