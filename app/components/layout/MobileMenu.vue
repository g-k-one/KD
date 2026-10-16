<script setup lang="ts">
const route = useRoute()
const session = useSessionStore()
const ui = useUiStore()

const close = () => (ui.mobileMenuOpen = false)
watch(() => route.fullPath, close)

// Lock page scroll while the drawer is open
const lock = useScrollLock(import.meta.client ? document.body : null)
watch(() => ui.mobileMenuOpen, (v) => (lock.value = v))

const settingsEl = useTemplateRef<HTMLElement>('settingsEl')
const scrollToSettings = () => settingsEl.value?.scrollIntoView({ behavior: 'smooth' })

async function logout() {
  close()
  await session.logout()
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-from-class="opacity-0" enter-active-class="transition-opacity duration-200" leave-to-class="opacity-0" leave-active-class="transition-opacity duration-150">
      <div v-if="ui.mobileMenuOpen" class="fixed inset-0 z-40 bg-black-60 lg:hidden" @click="close" />
    </Transition>
    <Transition enter-from-class="-translate-x-full" enter-active-class="transition-transform duration-250 ease-out" leave-to-class="-translate-x-full" leave-active-class="transition-transform duration-200 ease-in">
      <aside
        v-if="ui.mobileMenuOpen"
        class="scrollbar-none fixed inset-y-0 left-0 z-50 flex w-[min(320px,88vw)] flex-col gap-4 overflow-y-auto border-r border-neutral-4 bg-neutral-2 p-4 pb-[calc(80px+env(safe-area-inset-bottom))] lg:hidden"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-center gap-2">
          <UiLogo :height="32" />
          <div class="flex-1" />
          <UiButton variant="ghost" size="s" icon="globe" icon-only :aria-label="$t('settings.language')" @click="scrollToSettings" />
        </div>

        <LayoutProfileCard v-if="session.user" :user="session.user" compact class="rounded-3xl" />
        <UiButton v-else size="l" icon="sign-in" block @click="session.login()">{{ $t('auth.signInToPlay') }}</UiButton>

        <nav class="flex flex-col gap-0.5">
          <NuxtLink
            v-for="item in MAIN_NAV"
            :key="item.key"
            :to="item.to"
            class="type-14-caps flex h-12 items-center gap-3 rounded-md px-3"
            :class="isNavActive(route, item.to) ? 'bg-neutral-3 text-neutral-15' : 'text-neutral-12'"
          >
            <UiIcon :name="item.mobileIcon" :size="20" :class="isNavActive(route, item.to) && 'text-brand-light'" />
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
            class="type-14-caps flex h-12 items-center gap-3 rounded-md px-3 text-neutral-12"
          >
            <UiIcon :name="item.mobileIcon" :size="20" />
            {{ $t(`nav.${item.key}`) }}
          </NuxtLink>
          <button
            v-if="session.user"
            type="button"
            class="type-14-caps flex h-12 items-center gap-3 rounded-md px-3 text-neutral-12"
            @click="logout"
          >
            <UiIcon name="logout" :size="20" />
            {{ $t('auth.logOut') }}
          </button>
        </nav>

        <div ref="settingsEl" class="mt-4 scroll-mt-4 rounded-3xl border border-neutral-5 bg-neutral-2 p-4 shadow-elevation-2">
          <LayoutSettingsPanel />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
