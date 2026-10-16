<script setup lang="ts">
const route = useRoute()
const ui = useUiStore()

const TABS = [
  { key: 'cases', label: 'nav.cases', to: '/', icon: 'm-cases' },
  { key: 'upgrade', label: 'nav.upgrade', to: '/upgrade', icon: 'm-upgrade' },
  { key: 'bonus', label: 'nav.bonus', to: '/bonuses', icon: 'm-bonus' },
]

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
        class="type-12 flex h-16 flex-1 flex-col items-center justify-center gap-1"
        :class="tabClass(!ui.mobileMenuOpen && isNavActive(route, t.to))"
        @click="ui.mobileMenuOpen = false"
      >
        <UiIcon :name="t.icon" :size="20" />
        {{ $t(t.label) }}
      </NuxtLink>
      <button
        type="button"
        class="type-12 flex h-16 flex-1 flex-col items-center justify-center gap-1"
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
