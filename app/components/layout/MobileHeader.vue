<script setup lang="ts">
const session = useSessionStore()
const ui = useUiStore()
</script>

<template>
  <header class="flex h-15 items-center gap-2 border-b border-neutral-4 bg-neutral-1 px-4">
    <NuxtLink to="/" aria-label="KurwaDROP">
      <UiLogo :variant="session.user ? 'mark' : 'full'" :height="session.user ? 36 : 30" />
    </NuxtLink>
    <div class="flex-1" />

    <template v-if="session.user">
      <div class="flex h-11 items-center gap-2 rounded-2xl border border-neutral-4 bg-neutral-3 py-1 pr-1.5 pl-4">
        <LayoutBalance />
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
      icon="globe"
      icon-only
      :aria-label="$t('settings.language')"
      @click="ui.mobileMenuOpen = true"
    />

    <UiButton v-if="!session.user" size="s" icon="sign-in" @click="ui.openSignIn()">{{ $t('auth.signIn') }}</UiButton>
  </header>
</template>
