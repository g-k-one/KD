<script setup lang="ts">
// Debug → games: the upgrade dial driven by hand (any roll, any chance), the chicken moods, sounds and haptics.
type GaugeApi = { spin: (roll: number, fast: boolean) => Promise<void>; reset: () => void; skip: () => void }
const gauge = ref<GaugeApi | null>(null)
const g = reactive({ chance: 35, fast: false, roll: 20, state: 'idle' as 'idle' | 'spinning' | 'win' | 'lose' })

async function spin(roll = g.roll) {
  if (g.state === 'spinning') return
  g.roll = +roll.toFixed(2)
  g.state = 'spinning'
  await gauge.value?.spin(g.roll, g.fast)
  g.state = g.roll < g.chance ? 'win' : 'lose'
}
function reset() {
  g.state = 'idle'
  gauge.value?.reset()
}
const SCENARIOS = computed(() => [
  { label: 'Win', roll: () => Math.random() * g.chance * 0.8 + g.chance * 0.15 },
  { label: 'Lose', roll: () => g.chance + Math.random() * (100 - g.chance) },
  { label: 'Near win', roll: () => Math.max(0, g.chance - 0.4 - Math.random() * 2) },
  { label: 'Near lose', roll: () => Math.min(99.99, g.chance + 0.4 + Math.random() * 2) },
])

const moodPick = ref<'none' | 'nearWin' | 'nearLose'>('none')
const mood = computed(() => (moodPick.value === 'none' ? null : moodPick.value))
const sfx = useSfx()
const haptics = useHaptics()
// KURWADROP's chicken: its recorded sprite, one beat at a time and the whole show at henShow's timing
// ...and the banner chicken's poke sprite
onMounted(() => (sfx.henLoad(), sfx.pokeLoad()))
const HEN_SHOW: [number, () => void][] = [[120, sfx.henSwap], [130, sfx.henBody], [820, () => sfx.henScream()], [1750, () => sfx.henInflate()], [2150, sfx.henPop]]
// Grouped as the game uses them: the chicken (reel and banner), the games' own beats, the moments of play outside the
// games (stake, target, refusals); plain presses are silent on purpose
const SOUNDS: [string, () => void][] = [
  ['chicken show', () => HEN_SHOW.forEach(([ms, f]) => setTimeout(f, ms))],
  ['chicken swap', sfx.henSwap],
  ['chicken body', sfx.henBody],
  ['chicken KURWA', () => sfx.henScream()],
  ['chicken stretch', () => sfx.henInflate()],
  ['chicken pop', sfx.henPop],
  ['banner poke', () => sfx.henPoke(1)],
  ['banner poke ×3', () => sfx.henPoke(2, 3)],
  ['banner fed up', () => sfx.henPoke(3)],
  ['squawk', sfx.squawk],
  ['tick', sfx.tick],
  ['coin', sfx.coin],
  ['heart', sfx.heart],
  ['count', () => sfx.count()],
  ['count last', () => sfx.count(true)],
  ['lose', sfx.lose],
  ['launch (tick + coin)', sfx.riser],
  ['tense', sfx.tense],
  ['VS hit: plush', () => sfx.vsHit('a')],
  ['VS hit: wood', () => sfx.vsHit('b')],
  ['VS hit: synth', () => sfx.vsHit('c')],
  ['claim', sfx.claim],
  ['win', sfx.win],
  ['level up', sfx.levelUp],
  ...[0, 1, 2, 3, 4].map((t) => [`reveal ${t}`, () => sfx.reveal(t)] as [string, () => void]),
  ...[1, 3, 6].map((n) => [`skin in (${n})`, () => sfx.select(n)] as [string, () => void]),
  ['skin out', sfx.deselect],
  ['target picked', sfx.pick],
  ['refused', sfx.denied],
  ['done', sfx.ok],
]
const HAPTICS: [string, () => void][] = [
  ['tap', haptics.tap],
  ['rare', haptics.rare],
  ['jackpot', haptics.jackpot],
  ['lose', haptics.lose],
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="dbg-card">
      <h2 class="dbg-h">Upgrade dial <span class="dbg-note">UpgradeGauge · {{ g.state }}</span></h2>
      <div class="dbg-play">
        <div class="relative grid flex-1 place-items-center rounded-2xl bg-neutral-1 px-4 pt-6 pb-16">
          <UpgradeGauge ref="gauge" :chance="g.chance" :state="g.state" :nonce="42" />
        </div>
        <div class="dbg-knobs">
          <label class="flex flex-col gap-1"><span class="dbg-note">Chance · {{ g.chance }}%</span><UiSlider v-model="g.chance" :min="1" :max="80" label="Chance %" /></label>
          <label class="flex flex-col gap-1"><span class="dbg-note">Roll · {{ g.roll }}</span><UiSlider v-model="g.roll" :min="0" :max="100" label="Roll" /></label>
          <div class="flex flex-wrap gap-3">
            <UiToggle v-model="g.fast" label="Fast" />
          </div>
          <div class="flex flex-wrap gap-2">
            <UiButton size="s" icon="upgrade" :disabled="g.state === 'spinning'" @click="spin()">Spin to {{ g.roll }}</UiButton>
            <UiButton v-for="s in SCENARIOS" :key="s.label" size="s" variant="secondary" :disabled="g.state === 'spinning'" @click="spin(s.roll())">{{ s.label }}</UiButton>
          </div>
          <div class="flex flex-wrap gap-2">
            <UiButton size="s" variant="ghost" :disabled="g.state !== 'spinning'" @click="gauge?.skip()">Skip</UiButton>
            <UiButton size="s" variant="ghost" icon="refresh" @click="reset">Reset</UiButton>
          </div>
        </div>
      </div>
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="dbg-card">
        <h2 class="dbg-h">Upgrade chicken <span class="dbg-note">UpgradeChicken · its moods by the line</span></h2>
        <div class="relative h-56 overflow-hidden rounded-2xl bg-neutral-1">
          <div class="absolute inset-x-0 bottom-12 h-px bg-neutral-6" />
          <div class="absolute inset-x-0 bottom-12">
            <UpgradeChicken :mood="mood" :margin="mood ? 0.42 : undefined" />
          </div>
        </div>
        <UiSegmented v-model="moodPick" :options="[{ value: 'none', label: 'None' }, { value: 'nearWin', label: 'Near win' }, { value: 'nearLose', label: 'Near lose' }]" size="s" />
      </section>

      <section class="dbg-card">
        <h2 class="dbg-h">Sound · Haptics</h2>
        <div class="flex flex-wrap gap-2">
          <UiButton v-for="[n, f] in SOUNDS" :key="n" size="s" variant="secondary" icon="sound" @click="f()">{{ n }}</UiButton>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiButton v-for="[n, f] in HAPTICS" :key="n" size="s" variant="ghost" @click="f()">{{ n }}</UiButton>
        </div>
        <span class="dbg-note">Haptics only buzz on phones with vibration.</span>
      </section>
    </div>
  </div>
</template>
