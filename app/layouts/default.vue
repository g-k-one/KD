<script setup lang="ts">
const ui = useUiStore()
const route = useRoute()
watch(() => route.fullPath, () => (ui.popover = null))
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <div class="sticky top-0 z-30">
      <LayoutDesktopHeader class="hidden lg:flex" />
      <LayoutMobileHeader class="lg:hidden" />
    </div>
    <LayoutLiveFeed />

    <main class="flex-1 pb-10 lg:pb-14">
      <slot />
    </main>

    <LayoutAppFooter class="pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0" />

    <LayoutBottomNav class="lg:hidden" />
    <LayoutMobileMenu />
    <LayoutSignInModal />
    <UiToaster />
    <LayoutDebugDock />
  </div>
</template>
