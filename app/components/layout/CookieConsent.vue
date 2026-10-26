<script setup lang="ts">
import type { ConsentCategory } from '~/composables/useConsent'

// The cookie banner (GDPR / ePrivacy): a card in the corner on desktop, above the bottom bar on phones, that never
// blocks the page. Reject all and Accept all are the same size, one tap each; Settings opens the categories in the
// same card, nothing pre-ticked. Reopened from the footer it opens straight on Settings with the current choice.
const consent = useConsent()
const view = ref<'short' | 'settings'>('short')
const choice = reactive<Record<ConsentCategory, boolean>>({ analytics: false, marketing: false })

// first visit: comes in a moment after the page, so it doesn't fight the first paint
const ready = ref(false)
onMounted(() => setTimeout(() => (ready.value = true), 600))
const visible = computed(() => ready.value && consent.open.value)

watch(
  consent.editing,
  (on) => {
    if (!on) return
    Object.assign(choice, consent.current.value)
    view.value = 'settings'
  },
  { immediate: true },
)
watch(visible, (on) => !on && (view.value = 'short'))

const CATEGORIES: Array<{ key: ConsentCategory | 'necessary'; always?: boolean }> = [
  { key: 'necessary', always: true },
  { key: 'analytics' },
  { key: 'marketing' },
]
</script>

<template>
  <Transition name="kd-consent">
    <section
      v-if="visible"
      role="dialog"
      aria-labelledby="kd-consent-title"
      class="kd-consent fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 flex flex-col gap-4 rounded-3xl border border-neutral-5 bg-neutral-2 p-4 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-105"
    >
      <div class="flex items-start gap-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-24 text-brand-light"><UiIcon name="cookie" :size="22" /></span>
        <div class="flex min-w-0 flex-col gap-1">
          <h2 id="kd-consent-title" class="type-16-caps">{{ $t('cookies.title') }}</h2>
          <p class="type-14-regular text-neutral-11">
            {{ $t('cookies.text') }}
            <NuxtLink to="/privacy#cookies" class="text-neutral-13 underline underline-offset-2 hover:text-neutral-15">{{ $t('cookies.policy') }}</NuxtLink>
          </p>
        </div>
      </div>

      <!-- the categories: necessary always on, the rest off until turned on -->
      <ul v-if="view === 'settings'" class="flex flex-col rounded-lg bg-neutral-3">
        <li v-for="c in CATEGORIES" :key="c.key" class="flex items-center gap-3 border-t border-neutral-5 px-3 py-2.5 first:border-t-0">
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="type-14-caps">{{ $t(`cookies.${c.key}`) }}</span>
            <span class="type-12-regular text-neutral-11">{{ $t(`cookies.${c.key}Hint`) }}</span>
          </span>
          <span v-if="c.always" class="type-10-caps shrink-0 text-neutral-11">{{ $t('cookies.alwaysOn') }}</span>
          <UiToggle v-if="c.always" :model-value="true" disabled :label="$t(`cookies.${c.key}`)" />
          <UiToggle v-else v-model="choice[c.key as ConsentCategory]" :label="$t(`cookies.${c.key}`)" />
        </li>
      </ul>

      <div class="flex flex-col gap-2">
        <div class="grid grid-cols-2 gap-2">
          <UiButton v-if="view === 'short'" variant="secondary" block @click="consent.rejectAll()">{{ $t('cookies.rejectAll') }}</UiButton>
          <UiButton v-else variant="secondary" block @click="consent.save({ ...choice })">{{ $t('cookies.save') }}</UiButton>
          <UiButton block @click="consent.acceptAll()">{{ $t('cookies.acceptAll') }}</UiButton>
        </div>
        <UiButton v-if="view === 'short'" variant="ghost" size="s" icon="sliders" class="self-center" @click="view = 'settings'">{{ $t('cookies.settings') }}</UiButton>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.kd-consent {
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.6);
}
.kd-consent-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.kd-consent-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-consent-enter-from,
.kd-consent-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
