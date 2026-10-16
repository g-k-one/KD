<script setup lang="ts">
const route = useRoute()
const session = useSessionStore()
const ui = useUiStore()

const settingsRoot = useTemplateRef<HTMLElement>('settingsRoot')
const profileRoot = useTemplateRef<HTMLElement>('profileRoot')
onClickOutside(settingsRoot, () => ui.popover === 'settings' && (ui.popover = null))
onClickOutside(profileRoot, () => ui.popover === 'profile' && (ui.popover = null))
onKeyStroke('Escape', () => (ui.popover = null))

const desktopNav = MAIN_NAV

const PROFILE_MENU = [
  { key: 'profile', label: 'profile.profile', icon: 'user', to: '/profile' },
  { key: 'inventory', label: 'profile.inventory', icon: 'inventory', to: '/inventory' },
  { key: 'history', label: 'profile.gameHistory', icon: 'history', to: '/history' },
  { key: 'fair', label: 'nav.provablyFair', icon: 'shield', to: '/fairness' },
  { key: 'settings', label: 'profile.settings', icon: 'sliders', to: '/settings' },
]

async function logout() {
  ui.popover = null
  await session.logout()
}
</script>

<template>
  <header class="relative flex h-18 items-center gap-2 border-b border-neutral-4 bg-neutral-1 px-4">
    <NuxtLink to="/" class="mr-4 shrink-0" aria-label="KurwaDROP">
      <UiLogo :height="40" />
    </NuxtLink>

    <nav class="flex items-center gap-6">
      <NuxtLink
        v-for="item in desktopNav"
        :key="item.key"
        :to="item.to"
        class="group type-14-caps flex h-10 items-center gap-2 transition-colors"
        :class="isNavActive(route, item.to) ? 'text-neutral-15' : 'text-neutral-12 hover:text-neutral-15'"
      >
        <UiIcon
          :name="item.icon"
          :size="20"
          :class="isNavActive(route, item.to) ? 'text-brand-light' : 'text-neutral-12 group-hover:text-neutral-15'"
        />
        {{ $t(`nav.${item.key}`) }}
      </NuxtLink>
    </nav>

    <div class="flex-1" />

    <div ref="settingsRoot" class="relative">
      <UiButton
        variant="ghost"
        icon="settings"
        icon-only
        :class="ui.popover === 'settings' && 'bg-white-8 text-neutral-15'"
        :aria-label="$t('settings.title')"
        :aria-expanded="ui.popover === 'settings'"
        @click="ui.togglePopover('settings')"
      />
      <div
        v-if="ui.popover === 'settings'"
        class="absolute top-full right-0 z-40 mt-2 w-80 rounded-3xl border border-neutral-5 bg-neutral-2 p-4 shadow-elevation-2"
      >
        <LayoutSettingsPanel />
      </div>
    </div>

    <template v-if="session.user">
      <div
        ref="profileRoot"
        class="relative flex h-11 items-center gap-2 rounded-2xl border border-neutral-4 bg-neutral-3 py-1 pr-1.5 pl-4"
      >
        <UiPrice :amount="session.user.balance" size="m" />
        <UiButton size="s" icon="plus" to="/deposit" class="ml-0.5">{{ $t('wallet.deposit') }}</UiButton>
        <span class="h-6 w-px bg-neutral-7" />
        <button
          type="button"
          class="flex items-center gap-0 rounded-md"
          :aria-label="$t('profile.openMenu')"
          :aria-expanded="ui.popover === 'profile'"
          @click="ui.togglePopover('profile')"
        >
          <UiAvatar :src="session.user.avatar" :level="session.user.level" />
          <span class="grid size-8 place-items-center text-neutral-12">
            <UiIcon name="chevron-down-sm" :size="16" class="transition-transform" :class="ui.popover === 'profile' && 'rotate-180'" />
          </span>
        </button>

        <div
          v-if="ui.popover === 'profile'"
          class="absolute top-full right-0 z-40 mt-2 flex w-80 flex-col gap-4 rounded-3xl border border-neutral-5 bg-neutral-2 p-4 shadow-elevation-2"
        >
          <LayoutProfileCard :user="session.user" />
          <nav class="flex flex-col gap-0.5">
            <NuxtLink
              v-for="m in PROFILE_MENU"
              :key="m.key"
              :to="m.to"
              class="type-14-caps flex h-12 items-center gap-3 rounded-md px-3 transition-colors"
              :class="route.path === m.to ? 'bg-neutral-3 text-neutral-15' : 'text-neutral-12 hover:bg-neutral-3 hover:text-neutral-15'"
              @click="ui.popover = null"
            >
              <UiIcon :name="m.icon" :size="20" />
              {{ $t(m.label) }}
            </NuxtLink>
          </nav>
          <div class="h-px bg-neutral-4" />
          <button
            type="button"
            class="type-14-caps flex h-12 items-center gap-3 rounded-md px-3 text-neutral-12 hover:bg-neutral-3 hover:text-neutral-15"
            @click="logout"
          >
            <UiIcon name="logout" :size="20" />
            {{ $t('auth.logOut') }}
          </button>
        </div>
      </div>
    </template>
    <UiButton v-else icon="sign-in" @click="session.login()">{{ $t('auth.signInToPlay') }}</UiButton>
  </header>
</template>
