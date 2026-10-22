<script setup lang="ts">
const route = useRoute()
const ui = useUiStore()

const TABS = [
  { key: 'cases', label: 'nav.cases', to: '/', icon: 'm-cases' },
  { key: 'upgrade', label: 'nav.upgrade', to: '/upgrade', icon: 'm-upgrade' },
  { key: 'bonus', label: 'nav.bonus', to: '/bonuses', icon: 'm-bonus' },
]

// The bonus tab doubles as the free case timer on phones (the desktop header has its own chip): the countdown
// to the next daily case replaces the label until it is ready, then the dot says "come and take it"
const { dailyReady, dailyIn, claimable } = useBonuses()
const tabClass = (active: boolean) => (active ? 'text-brand-light' : 'text-neutral-13')
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-8/60 bg-neutral-2 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_var(--color-black-60)]"
  >
    <div class="flex h-16 items-center">
      <NuxtLink
        v-for="t in TABS"
        :key="t.key"
        :to="t.to"
        class="kd-press type-12 flex h-16 flex-1 flex-col items-center justify-center gap-1"
        :class="tabClass(!ui.mobileMenuOpen && isNavActive(route, t.to))"
        @click.capture="ui.mobileMenuOpen = false"
      >
        <span class="relative">
          <UiIcon :name="t.icon" :size="20" class="kd-icon" />
          <span v-if="t.key === 'bonus' && (dailyReady || claimable)" class="kd-dot absolute -top-0.5 -right-1 size-2 rounded-full bg-brand-base" />
        </span>
        <span v-if="t.key === 'bonus' && dailyIn" class="tabular-nums">{{ dailyIn }}</span>
        <template v-else>{{ $t(t.label) }}</template>
      </NuxtLink>
      <button
        type="button"
        class="kd-press type-12 flex h-16 flex-1 flex-col items-center justify-center gap-1"
        :class="tabClass(ui.mobileMenuOpen)"
        :aria-expanded="ui.mobileMenuOpen"
        @click="ui.mobileMenuOpen = !ui.mobileMenuOpen"
      >
        <UiIcon name="m-menu" :size="20" />
        {{ $t('nav.menu') }}
      </button>
    </div>
  </nav>
</template>

<style scoped>
.kd-dot {
  box-shadow: 0 0 0 2px var(--color-neutral-2);
  animation: kd-dot 1.6s ease-in-out infinite;
}
@keyframes kd-dot {
  50% {
    transform: scale(1.35);
  }
}
</style>
