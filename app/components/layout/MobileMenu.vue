<script setup lang="ts">
// Figma "MobileMenu". Slides in from the right, the side its icon sits on (top right of the header),
// and opens with the account first: that is what people come to the menu for.
const route = useRoute()
const session = useSessionStore()
const ui = useUiStore()

const close = () => (ui.mobileMenuOpen = false)
watch(() => route.fullPath, close)

// Lock page scroll while the drawer is open; Escape closes it. The drawer is phones-only (lg:hidden): a window widened
// past it (a turned tablet) closes it, or the page stayed locked under a menu nobody can see
const isLg = useIsLg()
watch(isLg, (v) => v && close())
useOverlay(() => ui.mobileMenuOpen && !isLg.value, close)

const settingsEl = useTemplateRef<HTMLElement>('settingsEl')
const scrollToSettings = () => settingsEl.value?.scrollIntoView({ behavior: 'smooth' })

// The profile holds the skins too, so there is no separate Inventory: two places, two tiles
const ACCOUNT = [
  { key: 'profile', label: 'profile.profile', icon: 'user', to: '/profile' },
  { key: 'history', label: 'profile.gameHistory', icon: 'history', to: '/profile?tab=history' },
]

async function logout() {
  close()
  await session.logout()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="kd-scrim">
      <div v-if="ui.mobileMenuOpen" class="fixed inset-0 z-40 bg-black-60 backdrop-blur-[2px] lg:hidden" @click="close" />
    </Transition>
    <Transition name="kd-drawer">
      <aside
        v-if="ui.mobileMenuOpen"
        class="scrollbar-none fixed inset-y-0 right-0 z-50 flex w-[min(340px,90vw)] flex-col gap-4 overflow-y-auto border-l border-neutral-4 bg-neutral-2 p-4 pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(88px+env(safe-area-inset-bottom))] lg:hidden"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('nav.menu')"
      >
        <div class="flex items-center gap-1">
          <UiLogo :height="32" />
          <div class="flex-1" />
          <UiButton variant="ghost" size="s" icon="globe" icon-only :aria-label="$t('settings.language')" @click="scrollToSettings" />
          <UiButton variant="ghost" size="s" icon="close" icon-only :aria-label="$t('common.close')" @click="close" />
        </div>

        <template v-if="session.user">
          <NuxtLink to="/profile" class="kd-press kd-press-wide block rounded-3xl" :aria-label="$t('profile.profile')">
            <LayoutProfileCard :user="session.user" compact :actions="false" class="pointer-events-none rounded-4xl bg-neutral-3/40 p-3" />
          </NuxtLink>
          <div class="grid grid-cols-2 gap-2">
            <UiButton size="m" icon="plus" to="/deposit">{{ $t('wallet.deposit') }}</UiButton>
            <UiButton variant="secondary" size="m" icon="arrow-up" to="/profile?tab=inventory">{{ $t('wallet.withdraw') }}</UiButton>
          </div>
          <nav class="grid grid-cols-2 gap-2">
            <NuxtLink
              v-for="a in ACCOUNT"
              :key="a.key"
              :to="a.to"
              class="kd-press type-12-caps flex flex-col items-center gap-2 rounded-2xl bg-neutral-3 px-2 py-3 text-center text-neutral-13 hover:text-neutral-15"
            >
              <UiIcon :name="a.icon" :size="22" class="text-brand-light" />
              {{ $t(a.label) }}
            </NuxtLink>
          </nav>
        </template>
        <UiButton v-else size="l" icon="sign-in" block @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>

        <nav class="flex flex-col gap-0.5">
          <NuxtLink
            v-for="item in MAIN_NAV"
            :key="item.key"
            :to="item.to"
            class="kd-press kd-press-wide type-14-caps flex h-12 items-center gap-3 rounded-md px-3"
            :class="isNavActive(route, item.to) ? 'bg-neutral-3 text-neutral-15' : 'text-neutral-12'"
          >
            <UiIcon :name="item.mobileIcon" :size="20" :class="isNavActive(route, item.to) && (item.accent ?? 'text-brand-light')" />
            <span class="flex-1">{{ $t(`nav.${item.key}`) }}</span>
            <span v-if="item.badge" class="type-12 rounded-md bg-neutral-6 px-2 py-1 text-neutral-15 normal-case">{{ $t(item.badge) }}</span>
          </NuxtLink>
        </nav>

        <div class="h-px bg-neutral-4" />

        <nav class="flex flex-col gap-0.5">
          <NuxtLink
            v-for="item in INFO_NAV"
            :key="item.key"
            :to="item.to"
            class="kd-press kd-press-wide type-14-caps flex h-12 items-center gap-3 rounded-md px-3 text-neutral-12"
          >
            <UiIcon :name="item.mobileIcon" :size="20" />
            {{ $t(`nav.${item.key}`) }}
          </NuxtLink>
          <button
            v-if="session.user"
            type="button"
            class="kd-press kd-press-wide type-14-caps flex h-12 items-center gap-3 rounded-md px-3 text-neutral-12"
            @click="logout"
          >
            <UiIcon name="logout" :size="20" />
            {{ $t('auth.logOut') }}
          </button>
        </nav>

        <div ref="settingsEl" class="scroll-mt-4 rounded-5xl border border-neutral-5 bg-neutral-2 p-4">
          <LayoutSettingsPanel />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.kd-scrim-enter-active,
.kd-scrim-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-scrim-enter-from,
.kd-scrim-leave-to {
  opacity: 0;
}
.kd-drawer-enter-active {
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-drawer-leave-active {
  transition: transform var(--dur-base) var(--ease-in);
}
.kd-drawer-enter-from,
.kd-drawer-leave-to {
  transform: translateX(100%);
}
/* Sections slide in one after another behind the panel */
.kd-drawer-enter-active > * {
  animation: kd-drawer-row var(--dur-slow) var(--ease-out) both;
}
.kd-drawer-enter-active > :nth-child(2) {
  animation-delay: 40ms;
}
.kd-drawer-enter-active > :nth-child(3) {
  animation-delay: 70ms;
}
.kd-drawer-enter-active > :nth-child(4) {
  animation-delay: 100ms;
}
.kd-drawer-enter-active > :nth-child(n + 5) {
  animation-delay: 130ms;
}
@keyframes kd-drawer-row {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
}
</style>
