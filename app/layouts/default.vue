<script setup lang="ts">
const ui = useUiStore()
const settings = useSettingsStore()
const route = useRoute()
// Debug dock: dev server and the prototype build; a production build sets NUXT_PUBLIC_DEBUG=false
const debug = useRuntimeConfig().public.debug
watch(() => route.fullPath, () => (ui.popover = null))
// Streamer mode: private bits (.kd-private — the trade link, the Steam ID) blur until hovered or focused
useHead({ htmlAttrs: { class: computed(() => (settings.settings.streamerMode ? 'is-streamer' : '')) } })
</script>

<template>
  <!-- overflow-x clip: effect layers reach past the screen's edge on purpose (sparks are never cut), the page never
       scrolls sideways; clip, not hidden, so the sticky header keeps working -->
  <div class="flex min-h-dvh flex-col overflow-x-clip">
    <!-- the page itself (contents: no box of its own, the layout is unchanged); a modal makes it inert, see useOverlay -->
    <div id="kd-page" class="contents">
    <div class="kd-sticky-top sticky top-0 z-30">
      <LayoutDesktopHeader class="hidden lg:flex" />
      <LayoutMobileHeader class="lg:hidden" />
    </div>
    <!-- the live drops strip, unless the player turned it off in the settings -->
    <LayoutLiveFeed v-if="settings.settings.liveFeed" />

    <main class="flex-1 pb-10 lg:pb-14">
      <slot />
    </main>

    <LayoutAppFooter class="pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0" />

    <LayoutBottomNav class="lg:hidden" />
    </div>
    <LayoutMobileMenu />
    <LayoutSignInModal />
    <WalletQuickDeposit />
    <WalletInventoryDrawer />
    <LayoutLevelUp />
    <UiToaster />
    <LayoutCookieConsent />
    <LayoutDebugDock v-if="debug" />
  </div>
</template>
