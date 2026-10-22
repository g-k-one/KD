<script setup lang="ts">
import type { MissionChain } from '#shared/types/api'

/*
 * Mission chains (docs/ux-research-v3.md #10, Skin.Club): three themed paths of three steps that walk a new
 * player through the site — case, upgrade, battle; sell, win, play; create, play, win. Steps go in order, so
 * each card shows one clear next thing with a way to do it. The end of a chain is a free case, opened on the
 * bonus reel above (the page handles `open`).
 */
defineProps<{ chains: MissionChain[]; opening?: string | null }>()
const emit = defineEmits<{ open: [chain: MissionChain] }>()
const { t } = useI18n()
const ui = useUiStore()

const finished = (c: MissionChain) => c.status !== 'active'
const stepLabel = (c: MissionChain, i: number) => {
  const s = c.steps[i]!
  return s.kind === 'spend' ? `${formatCoins(s.progress)} / ${formatCoins(s.goal)}` : `${s.progress} / ${s.goal}`
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <h2 class="type-20-caps">
        {{ $t('chain.title') }} <span class="text-neutral-11 tabular-nums">{{ chains.filter(finished).length }}/{{ chains.length }}</span>
      </h2>
      <p class="type-14-regular text-neutral-12">{{ $t('chain.hint') }}</p>
    </div>
    <div class="grid gap-2 md:grid-cols-3">
      <div v-for="c in chains" :key="c.id" class="kd-chain flex flex-col gap-3 rounded-3xl p-4" :class="`is-${c.status}`">
        <div class="flex items-center gap-3">
          <img :src="c.case.image" alt="" class="kd-chain-case size-14 shrink-0 object-contain" />
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="type-16-caps truncate">{{ $t(`chain.${c.id}`) }}</span>
            <span class="type-12-caps truncate text-coin">{{ $t('chain.free', { name: c.case.name }) }}</span>
          </span>
          <span class="type-12-caps shrink-0 text-neutral-11 tabular-nums">{{ Math.min(c.current, c.steps.length) }}/{{ c.steps.length }}</span>
        </div>

        <!-- One step at a time: done ones are ticked, the current one carries its progress and a way there -->
        <ol class="flex flex-col gap-1">
          <li
            v-for="(s, i) in c.steps"
            :key="i"
            class="kd-step flex h-11 items-center gap-3 rounded-xl px-2"
            :class="i < c.current ? 'is-done' : i === c.current ? 'is-now' : 'is-next'"
          >
            <span class="kd-step-dot grid size-6 shrink-0 place-items-center rounded-full">
              <UiIcon v-if="i < c.current" name="check-sm" :size="14" />
              <span v-else class="type-10-caps">{{ i + 1 }}</span>
            </span>
            <span class="type-14 min-w-0 flex-1 truncate">{{ missionTitle(t, s.kind, s.goal) }}</span>
            <template v-if="i === c.current">
              <span v-if="s.goal > 1" class="type-12 shrink-0 text-neutral-11 tabular-nums">{{ stepLabel(c, i) }}</span>
              <!-- selling happens in the inventory drawer, over this page -->
              <button
                v-if="s.kind === 'sell_skin'"
                type="button"
                class="kd-press type-12-caps flex h-8 shrink-0 items-center gap-0.5 text-brand-light hover:text-neutral-15"
                @click="ui.inventoryOpen = true"
              >
                {{ $t('bonus.go') }}<UiIcon name="chevron-right" :size="14" />
              </button>
              <NuxtLink v-else :to="MISSION_LINK[s.kind]" class="kd-press type-12-caps flex h-8 shrink-0 items-center gap-0.5 text-brand-light hover:text-neutral-15">
                {{ $t('bonus.go') }}<UiIcon name="chevron-right" :size="14" />
              </NuxtLink>
            </template>
          </li>
        </ol>

        <UiButton v-if="c.status === 'claimable'" variant="gold" size="l" block icon="cases" :loading="opening === c.id" @click="emit('open', c)">{{ $t('chain.open') }}</UiButton>
        <span v-else-if="c.status === 'claimed'" class="type-12-caps flex h-12 items-center justify-center gap-1 text-success"><UiIcon name="check-sm" :size="16" />{{ $t('chain.opened') }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.kd-chain {
  position: relative;
  background: var(--color-neutral-2);
  transition:
    background-color var(--dur-slow) var(--ease-out),
    opacity var(--dur-slow) var(--ease-out);
}
.kd-chain-case {
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.5));
}
.kd-chain.is-active .kd-chain-case {
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.5)) grayscale(0.6) brightness(0.8);
}
.kd-chain.is-claimable {
  background: linear-gradient(180deg, rgb(228 174 57 / 0.16), var(--color-neutral-2) 70%);
}
.kd-chain.is-claimable::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 8px 24px -12px rgb(228 174 57 / 0.7);
  opacity: 0;
  pointer-events: none;
  animation: kd-glow-pulse 1.8s ease-in-out infinite;
}
.kd-chain.is-claimed {
  opacity: 0.6;
}
.kd-step-dot {
  background: var(--color-neutral-4);
  color: var(--color-neutral-11);
}
.kd-step.is-done {
  color: var(--color-neutral-11);
}
.kd-step.is-done .kd-step-dot {
  background: rgb(18 183 106 / 0.2);
  color: var(--color-success);
}
.kd-step.is-now {
  background: var(--color-neutral-3);
}
.kd-step.is-now .kd-step-dot {
  background: var(--color-brand-base);
  color: var(--color-neutral-15);
}
.kd-step.is-next {
  color: var(--color-neutral-10);
}
</style>
