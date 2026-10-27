<script setup lang="ts">
const session = useSessionStore()
const ui = useUiStore()
</script>

<template>
  <header class="flex h-15 items-center gap-2 border-b border-neutral-4 bg-neutral-1 px-4">
    <!-- flex, so the logo centres in the bar (as a line of text it sat on a baseline, a few px high) -->
    <NuxtLink to="/" aria-label="KurwaDROP" class="kd-hit relative flex items-center">
      <UiLogo :variant="session.user ? 'mark' : 'full'" :height="session.user ? 36 : 30" />
    </NuxtLink>
    <div class="flex-1" />

    <template v-if="session.user">
      <!-- the balance pill with Deposit inside it: a 32 px button 3 px in, the pill's corner 6 + 3 + its 1 px border -->
      <div class="flex h-10 items-center gap-2 rounded-xl border border-neutral-4 bg-neutral-3 py-[3px] pr-[3px] pl-3">
        <button type="button" class="kd-press kd-hit relative flex items-center gap-1.5 rounded-md" :aria-label="$t('drawer.title')" @click="ui.openInventory()">
          <UiIcon name="inventory" :size="16" class="text-neutral-12" />
          <LayoutBalance />
        </button>
        <UiButton size="s" icon="plus" icon-only to="/deposit" class="ml-0.5" :aria-label="$t('wallet.deposit')" />
      </div>
      <NuxtLink to="/profile" class="kd-press ml-1 rounded-full" :aria-label="$t('profile.profile')">
        <UiAvatar :src="session.user.avatar" :level="session.user.level" />
      </NuxtLink>
    </template>

    <UiButton
      v-if="!session.user"
      variant="ghost"
      size="s"
      icon="settings"
      icon-only
      :aria-label="$t('settings.title')"
      @click="ui.mobileMenuOpen = true"
    />

    <UiButton v-if="!session.user" size="s" icon="sign-in" @click="ui.openSignIn()">{{ $t('auth.signIn') }}</UiButton>
  </header>
</template>
