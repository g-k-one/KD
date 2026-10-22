<script setup lang="ts">
// Figma "Sign in · Modal". Mock: Steam OpenID is replaced by POST /api/auth/login.
const ui = useUiStore()
const session = useSessionStore()

const terms = ref(true)
const age = ref(true)
const loading = ref(false)

async function signIn() {
  loading.value = true
  try {
    await session.login()
    ui.signInOpen = false
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UiModal v-model="ui.signInOpen" :title="$t('auth.signInTitle')" :description="$t('auth.signInText')" :width="480">
    <template #media>
      <img src="/img/illustrations/sign-in.webp" alt="" class="kd-signin-art mx-auto h-50 w-auto max-w-full object-contain" />
    </template>
    <div class="flex flex-col gap-4">
      <UiCheckbox v-model="terms">{{ $t('auth.agreeTerms') }}</UiCheckbox>
      <UiCheckbox v-model="age">{{ $t('auth.confirmAge') }}</UiCheckbox>
    </div>
    <template #actions>
      <UiButton variant="light" size="l" icon="steam" block :disabled="!terms || !age" :loading="loading" @click="signIn">
        {{ $t('auth.viaSteam') }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
/* The mascot pops up from behind the crate when the modal opens. */
.kd-signin-art {
  animation: kd-pop-up var(--dur-slow) var(--ease-spring) 80ms both;
}
@keyframes kd-pop-up {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.92);
  }
}
</style>
