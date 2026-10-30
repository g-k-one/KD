<script setup lang="ts">
const route = useRoute()
const ui = useUiStore()
const session = useSessionStore()

// Even tabs, the same for guests and players: topping up is the + by the balance in the header, signing in its
// Sign in button and the menu its top-right icon, so the bar holds only places. A player's Profile tab wears their
// avatar; a guest has no profile yet, so the tab opens the sign-in
const TABS = [
  { key: 'cases', label: 'nav.cases', to: '/', icon: 'm-cases', order: 1 },
  { key: 'upgrade', label: 'nav.upgrade', to: '/upgrade', icon: 'm-upgrade', order: 2 },
  { key: 'pvp', label: 'nav.pvp', to: '/pvp', icon: 'm-pvp', order: 3 },
  { key: 'bonus', label: 'nav.bonus', to: '/bonuses', icon: 'm-bonus', order: 4 },
  { key: 'profile', label: 'profile.profile', to: '/profile', icon: 'user', order: 5 },
]
function onTab(key: string, e: MouseEvent) {
  ui.mobileMenuOpen = false
  if (key !== 'profile' || session.user) return
  e.preventDefault()
  ui.openSignIn()
}

// The bonus tab doubles as the free case timer on phones (the desktop header has its own chip): the countdown
// to the next daily case replaces the label until it is ready, then the dot says "come and take it"
const { dailyReady, dailyIn, freeCount } = useBonuses()
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
        :style="{ order: t.order }"
        :class="tabClass(!ui.mobileMenuOpen && isNavActive(route, t.to))"
        @click.capture="onTab(t.key, $event)"
      >
        <span class="relative">
          <img v-if="t.key === 'profile' && session.user" :src="session.user.avatar" alt="" class="size-5 rounded-full object-cover" />
          <UiIcon v-else :name="t.icon" :size="20" class="kd-icon" />
          <span v-if="t.key === 'bonus' && (dailyReady || freeCount)" class="kd-dot absolute -top-0.5 -right-1 size-2 rounded-full bg-brand-base" />
        </span>
        <span v-if="t.key === 'bonus' && dailyIn" class="tabular-nums">{{ dailyIn }}</span>
        <template v-else>{{ $t(t.label) }}</template>
      </NuxtLink>
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
