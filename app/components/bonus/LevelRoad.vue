<script setup lang="ts">
import type { LevelReward } from '#shared/types/api'

/*
 * Level rewards as a road: one node per level on a line that fills up to where the player is.
 * Claimed nodes carry a check, the ones waiting glow gold and are claimed with a tap, locked ones are dim.
 * Every 5th level is a milestone (bigger node, gift icon) — it also upgrades the daily case.
 */
const props = defineProps<{ levels: LevelReward[]; level: number; progress: number; claiming: number | null }>()
const emit = defineEmits<{ claim: [r: LevelReward] }>()

const track = useTemplateRef<HTMLElement>('track')
const nodes = ref<Record<number, HTMLElement>>({})
defineExpose({ nodes })

// Fill: whole steps up to the current level plus the part of the step towards the next one
const fill = computed(() => {
  const i = props.levels.findIndex((l) => l.level === props.level)
  if (i < 0) return 0
  return ((i + props.progress / 100) / Math.max(1, props.levels.length - 1)) * 100
})

watch(
  () => props.levels.length,
  () =>
    nextTick(() => {
      const el = nodes.value[props.level]
      if (el && track.value) track.value.scrollLeft = el.offsetLeft - track.value.clientWidth / 2 + el.clientWidth / 2
    }),
  { immediate: true },
)
</script>

<template>
  <div ref="track" class="scrollbar-none -mx-4 overflow-x-auto px-4 py-4 lg:mx-0 lg:px-2">
    <div class="relative flex w-max items-start gap-3">
      <!-- the road -->
      <div class="absolute top-8 right-8 left-8 h-1.5 -translate-y-1/2 rounded-full bg-neutral-4">
        <div class="kd-road-fill h-full rounded-full" :style="{ width: `${fill}%` }" />
      </div>
      <button
        v-for="r in levels"
        :key="r.level"
        :ref="(el) => el && (nodes[r.level] = el as HTMLElement)"
        type="button"
        class="kd-node relative z-[1] flex w-16 flex-col items-center gap-2"
        :class="[`is-${r.status}`, r.level % 5 === 0 && 'is-milestone', r.level === level && 'is-current']"
        :disabled="r.status !== 'claimable' || claiming === r.level"
        @click="emit('claim', r)"
      >
        <span class="kd-node-dot grid place-items-center rounded-full">
          <UiIcon v-if="r.status === 'claimed'" name="check" :size="20" />
          <UiIcon v-else-if="r.level % 5 === 0" name="bonuses" :size="22" />
          <span v-else class="type-16-caps tabular-nums">{{ r.level }}</span>
        </span>
        <span class="type-10-caps text-neutral-11 tabular-nums">{{ r.level % 5 === 0 || r.status === 'claimed' ? `LVL ${r.level}` : '' }}&nbsp;</span>
        <UiPrice :amount="r.coins" size="s" :tone="r.status === 'locked' ? 'muted' : 'coin'" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.kd-road-fill {
  background: linear-gradient(90deg, var(--color-success), #ffb13b);
  transition: width 900ms var(--ease-out);
}
.kd-node-dot {
  width: 64px;
  height: 64px;
  background: var(--color-neutral-3);
  color: var(--color-neutral-12);
  box-shadow: 0 0 0 4px var(--color-neutral-1);
  transition:
    background-color var(--dur-base) var(--ease-out),
    scale var(--dur-base) var(--ease-spring);
}
.kd-node.is-milestone .kd-node-dot {
  background: linear-gradient(180deg, #3a2a10, var(--color-neutral-3));
  color: var(--color-coin);
}
.kd-node.is-claimed .kd-node-dot {
  background: var(--color-success-24);
  color: var(--color-success);
}
.kd-node.is-locked {
  opacity: 0.45;
}
.kd-node.is-current .kd-node-dot {
  box-shadow:
    0 0 0 4px var(--color-neutral-1),
    0 0 0 6px var(--color-brand-base);
}
/* Waiting to be taken: gold, breathing, tap to claim */
.kd-node.is-claimable {
  cursor: pointer;
}
.kd-node-dot {
  position: relative;
}
.kd-node.is-claimable .kd-node-dot {
  background: linear-gradient(180deg, #ffd36b, var(--color-item-gold));
  color: var(--color-neutral-1);
  animation: kd-node-bob 1.6s var(--ease-in-out) infinite;
}
@keyframes kd-node-bob {
  50% {
    scale: 1.08;
  }
}
.kd-node.is-claimable .kd-node-dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 24px 2px rgb(228 174 57 / 0.6);
  opacity: 0;
  pointer-events: none;
  animation: kd-glow-pulse 1.6s ease-in-out infinite;
}

@media (hover: hover) {
  .kd-node.is-claimable:hover .kd-node-dot {
    scale: 1.1;
  }
}
</style>
