<script setup lang="ts">
// First-session hook (docs/ux-research-v3.md → C3, Clash.gg's "Claim free 3 cases"): guests see the offer and sign
// in from it; signed-in players with welcome cases left get a way to Bonuses, where the cases open. Hidden after.
const session = useSessionStore()
const ui = useUiStore()
const { data, welcomeLeft } = useBonuses()
const total = computed(() => data.value?.welcome?.total ?? 3)
const show = computed(() => !session.user || welcomeLeft.value > 0)
</script>

<template>
  <!-- concentric corners: 12px button + 12px padding = 24px (rounded-5xl) -->
  <section v-if="show" class="kd-welcome flex items-center gap-3 rounded-5xl p-3 pr-4 sm:gap-4">
    <img src="/img/cases/kurwa-classic.webp" alt="" class="size-14 shrink-0 object-contain sm:size-16" draggable="false" />
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="type-14-caps sm:type-16-caps">{{ session.user ? $t('welcome.userTitle', { n: welcomeLeft }, welcomeLeft) : $t('welcome.guestTitle', { n: total }) }}</span>
      <span class="type-12-regular text-neutral-12 max-sm:hidden">{{ session.user ? $t('welcome.userText') : $t('welcome.guestText') }}</span>
    </div>
    <UiButton v-if="session.user" size="m" icon="bonuses" to="/bonuses" class="shrink-0">{{ $t('welcome.open') }}</UiButton>
    <UiButton v-else size="m" icon="sign-in" class="shrink-0" @click="ui.openSignIn()">{{ $t('welcome.get') }}</UiButton>
  </section>
</template>

<style scoped>
.kd-welcome {
  background: linear-gradient(100deg, rgb(255 95 31 / 0.16), var(--color-neutral-2) 55%);
  box-shadow: inset 0 0 0 1px rgb(255 95 31 / 0.28);
}
</style>
