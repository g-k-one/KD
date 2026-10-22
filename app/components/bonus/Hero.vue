<script setup lang="ts">
import type { BonusesResponse } from '#shared/types/api'

/*
 * The top of Bonuses: everything at a glance, almost no text.
 *   Level ring — the level inside, XP progress around it, the next reward under it
 *   Three tiles — rakeback %, the daily case (ready / timer), missions done; each jumps to its section
 */
const props = defineProps<{ data: BonusesResponse; level: number; progress: number; dailyReady: boolean; dailyIn: string }>()
const emit = defineEmits<{ go: [section: 'daily' | 'missions' | 'rakeback'] }>()

const R = 52
const C = 2 * Math.PI * R
const dash = computed(() => C * (1 - props.progress / 100))
const next = computed(() => props.data.levels.find((l) => l.level === props.level + 1) ?? null)
const missionsDone = computed(() => props.data.missions.filter((m) => m.status !== 'active').length)
const missionsReady = computed(() => props.data.missions.some((m) => m.status === 'claimable'))
const rate = computed(() => `${(props.data.rakeback.rateBp / 100).toFixed(props.data.rakeback.rateBp % 100 ? 2 : 0)}%`)
const tierNames = ['I', 'II', 'III', 'IV']
</script>

<template>
  <section class="kd-hero grid gap-4 rounded-5xl p-4 md:grid-cols-[auto_1fr] md:items-center md:gap-8 md:p-6">
    <!-- Level ring -->
    <div class="flex items-center gap-5">
      <div class="relative size-32 shrink-0">
        <svg viewBox="0 0 120 120" class="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" :r="R" fill="none" stroke="var(--color-neutral-4)" stroke-width="8" />
          <circle cx="60" cy="60" :r="R" fill="none" stroke="url(#kd-xp)" stroke-width="8" stroke-linecap="round" :stroke-dasharray="C" :stroke-dashoffset="dash" class="kd-ring" />
          <defs>
            <linearGradient id="kd-xp" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#ffb13b" />
              <stop offset="1" stop-color="var(--color-brand-base)" />
            </linearGradient>
          </defs>
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="type-10-caps text-neutral-11">{{ $t('common.lvl') }}</span>
          <span class="text-4xl leading-none font-extrabold tabular-nums">{{ level }}</span>
          <span class="type-12 mt-1 text-neutral-11 tabular-nums">{{ progress }}%</span>
        </div>
      </div>
      <div v-if="next" class="flex flex-col gap-2">
        <span class="type-12-caps text-neutral-11">{{ $t('bonus.nextReward', { level: next.level }) }}</span>
        <UiPrice :amount="next.coins" size="xl" tone="coin" />
        <span v-if="next.dailyTier" class="type-10-caps self-start rounded-sm bg-warning-24 px-1.5 py-0.5 text-coin">{{ $t('bonus.dailyUp', { tier: tierNames[next.dailyTier - 1] }) }}</span>
      </div>
    </div>

    <!-- Tiles -->
    <div class="grid grid-cols-3 gap-2">
      <button type="button" class="kd-tile kd-press" @click="emit('go', 'rakeback')">
        <span class="kd-tile-ic is-coin"><UiIcon name="refresh" :size="20" /></span>
        <span class="type-20-caps tabular-nums">{{ rate }}</span>
        <span class="type-10-caps text-neutral-11">{{ $t('bonus.rakeback') }}</span>
      </button>
      <button type="button" class="kd-tile kd-press" :class="dailyReady && 'is-ready'" @click="emit('go', 'daily')">
        <span class="kd-tile-ic is-brand"><UiIcon name="bonuses" :size="20" /></span>
        <span class="type-20-caps tabular-nums">{{ dailyReady ? $t('bonus.ready') : dailyIn }}</span>
        <span class="type-10-caps text-neutral-11">{{ $t('bonus.dailyShort') }}</span>
      </button>
      <button type="button" class="kd-tile kd-press" :class="missionsReady && 'is-ready'" @click="emit('go', 'missions')">
        <span class="kd-tile-ic is-success"><UiIcon name="check-circle" :size="20" /></span>
        <span class="type-20-caps tabular-nums">{{ missionsDone }}/{{ data.missions.length }}</span>
        <span class="type-10-caps text-neutral-11">{{ $t('bonus.missions') }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.kd-hero {
  background:
    radial-gradient(90% 140% at 0% 0%, rgb(255 95 31 / 0.14), transparent 55%),
    var(--color-neutral-2);
}
.kd-ring {
  transition: stroke-dashoffset 900ms var(--ease-out);
  filter: drop-shadow(0 0 6px rgb(255 95 31 / 0.5));
}
.kd-tile {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border-radius: 20px;
  background: var(--color-neutral-3);
  padding: 14px 8px;
  text-align: center;
  transition: background-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-tile:hover {
    background: var(--color-neutral-4);
  }
}
.kd-tile {
  position: relative;
}
.kd-tile.is-ready {
  background: linear-gradient(180deg, rgb(255 95 31 / 0.18), var(--color-neutral-3));
}
.kd-tile.is-ready::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 8px 24px -12px rgb(255 95 31 / 0.7);
  opacity: 0;
  pointer-events: none;
  animation: kd-glow-pulse 2s ease-in-out infinite;
}

.kd-tile-ic {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 12px;
}
.kd-tile-ic.is-coin {
  background: rgb(253 176 34 / 0.14);
  color: var(--color-coin);
}
.kd-tile-ic.is-brand {
  background: var(--color-brand-24);
  color: var(--color-brand-light);
}
.kd-tile-ic.is-success {
  background: var(--color-success-24);
  color: var(--color-success);
}
</style>
