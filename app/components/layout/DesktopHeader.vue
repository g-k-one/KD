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
const { dailyReady, dailyIn, claimable } = useBonuses()
const { data: race } = useRace()
const raceClock = useClock(1000)
const raceIn = computed(() => (race.value ? countdownLong(race.value.endsAt, raceClock.value) : ''))

const PROFILE_MENU = [
  { key: 'profile', label: 'profile.profile', icon: 'user', to: '/profile' },
  { key: 'inventory', label: 'profile.inventory', icon: 'inventory', to: '/profile?tab=inventory' },
  { key: 'history', label: 'profile.gameHistory', icon: 'history', to: '/profile?tab=history' },
  { key: 'fair', label: 'nav.provablyFair', icon: 'shield', to: '/fairness' },
  { key: 'settings', label: 'profile.settings', icon: 'sliders', to: '/profile?tab=settings' },
]

async function logout() {
  ui.popover = null
  await session.logout()
}
</script>

<template>
  <header class="relative flex h-18 items-center gap-2 border-b border-neutral-4 bg-neutral-1 px-4">
    <NuxtLink to="/" class="kd-press mr-6 w-[118px] shrink-0" aria-label="KurwaDROP">
      <UiLogo :height="40" />
    </NuxtLink>

    <nav class="relative -ml-3 flex items-center">
      <NuxtLink
        v-for="item in desktopNav"
        :key="item.key"
        :to="item.to"
        class="kd-nav-link group type-14-caps relative flex h-10 items-center gap-2 rounded-full px-3 transition-colors duration-200"
        :class="isNavActive(route, item.to) ? 'text-neutral-15' : 'text-neutral-12 hover:text-neutral-15'"
      >
        <UiIcon
          :name="item.icon"
          :size="20"
          class="kd-icon transition-colors duration-200"
          :class="isNavActive(route, item.to) ? 'text-brand-light' : 'text-neutral-12 group-hover:text-neutral-15'"
        />
        {{ $t(`nav.${item.key}`) }}
      </NuxtLink>
    </nav>

    <div class="flex-1" />

    <!-- Weekly race: the countdown to the reset is the reason to play today (SkinFans' RACE chip) -->
    <NuxtLink
      v-if="race"
      to="/bonuses#race"
      class="kd-press kd-race type-12-caps mr-1 flex h-10 items-center gap-2 rounded-xl px-3 text-neutral-14"
    >
      <UiIcon name="trophy" :size="18" class="text-coin" />
      {{ $t('race.chip') }}
      <span class="tabular-nums text-neutral-12">{{ raceIn }}</span>
    </NuxtLink>

    <!-- Daily case: ready = glowing gift, otherwise the countdown -->
    <NuxtLink
      v-if="session.user"
      to="/bonuses"
      class="kd-press kd-daily type-12-caps relative mr-1 flex h-10 items-center gap-2 rounded-xl px-3"
      :class="dailyReady ? 'is-ready text-neutral-15' : 'text-neutral-12 hover:text-neutral-15'"
    >
      <UiIcon name="bonuses" :size="20" :class="dailyReady ? 'text-coin' : ''" />
      <UiTextSwap :text="dailyReady ? $t('bonus.dailyReady') : dailyIn" class="tabular-nums" />
      <span v-if="claimable" class="type-10-caps grid h-4 min-w-4 place-items-center rounded-full bg-brand-base px-1 text-neutral-1">{{ claimable }}</span>
    </NuxtLink>

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
      <Transition name="kd-pop">
        <div
          v-if="ui.popover === 'settings'"
          class="kd-popover absolute top-full right-0 z-40 mt-2 w-80 rounded-3xl border border-neutral-5 bg-neutral-2 p-4"
        >
          <LayoutSettingsPanel />
        </div>
      </Transition>
    </div>

    <template v-if="session.user">
      <div
        ref="profileRoot"
        class="relative flex h-11 items-center gap-2 rounded-2xl border border-neutral-4 bg-neutral-3 py-1 pr-1.5 pl-4"
      >
        <button type="button" class="kd-press flex items-center gap-2 rounded-md" :aria-label="$t('drawer.title')" @click="ui.openInventory()">
          <UiIcon name="inventory" :size="18" class="text-neutral-12" />
          <LayoutBalance />
        </button>
        <UiButton size="s" icon="plus" to="/deposit" class="ml-2.5">{{ $t('wallet.deposit') }}</UiButton>
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

        <Transition name="kd-pop">
        <div
          v-if="ui.popover === 'profile'"
          class="kd-popover absolute top-full right-0 z-40 mt-2 flex w-80 flex-col gap-4 rounded-3xl border border-neutral-5 bg-neutral-2 p-4"
        >
          <LayoutProfileCard :user="session.user" />
          <nav class="flex flex-col gap-0.5">
            <NuxtLink
              v-for="m in PROFILE_MENU"
              :key="m.key"
              :to="m.to"
              class="kd-press type-14-caps flex h-12 items-center gap-3 rounded-md px-3 active:bg-neutral-4"
              :class="route.fullPath === m.to ? 'bg-neutral-3 text-neutral-15' : 'text-neutral-12 hover:bg-neutral-3 hover:text-neutral-15'"
              @click.capture="ui.popover = null"
            >
              <UiIcon :name="m.icon" :size="20" />
              {{ $t(m.label) }}
            </NuxtLink>
          </nav>
          <div class="h-px bg-neutral-4" />
          <button
            type="button"
            class="kd-press type-14-caps flex h-12 items-center gap-3 rounded-md px-3 text-neutral-12 hover:bg-neutral-3 hover:text-neutral-15 active:bg-neutral-4"
            @click="logout"
          >
            <UiIcon name="logout" :size="20" />
            {{ $t('auth.logOut') }}
          </button>
        </div>
        </Transition>
      </div>
    </template>
    <UiButton v-else icon="sign-in" @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>
  </header>
</template>

<style scoped>
.kd-race {
  background: linear-gradient(100deg, rgb(253 176 34 / 0.14), transparent 70%);
  box-shadow: inset 0 0 0 1px rgb(253 176 34 / 0.28);
}
.kd-daily {
  position: relative;
}
.kd-daily.is-ready {
  background: rgb(253 176 34 / 0.12);
  box-shadow: inset 0 0 0 1px rgb(253 176 34 / 0.45);
}
.kd-daily.is-ready::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 18px -4px rgb(253 176 34 / 0.8);
  opacity: 0;
  pointer-events: none;
  animation: kd-glow-pulse 2s ease-in-out infinite;
}

/* Pressed: the label dims and sinks a touch; no background pill */
.kd-nav-link {
  transition:
    color 200ms var(--ease-out),
    transform var(--dur-base) var(--ease-spring),
    opacity var(--dur-base) var(--ease-out);
}
.kd-nav-link:active {
  transform: scale(0.95);
  opacity: 0.7;
  transition-duration: var(--dur-press);
}

/* Figma popovers: 0 8 12 black/64 shadow; they open from the corner they hang off */
.kd-popover {
  box-shadow: 0 8px 12px rgb(0 0 0 / 0.64);
  transform-origin: top right;
}
.kd-pop-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-pop-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-pop-enter-from,
.kd-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
