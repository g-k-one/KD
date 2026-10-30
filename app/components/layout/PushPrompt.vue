<script setup lang="ts">
// Asks to turn on browser notifications: our own card first, the browser's prompt only after a yes, so a "not now" costs
// nothing (a browser refusal is final). Desktop: top left under the live feed, where the browser's own prompt will open;
// phones: above the bottom bar, in reach of the thumb. Never with the cookie banner; for a signed-in player, away from the
// games, so it never lands on a spin. Later and the cross put it off for a week.
// TODO(backend): on a yes, send the browser's push subscription to the server; for now only the permission is asked.
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
const DELAY_MS = 10_000
const GAMES = /^\/(case|upgrade|pvp)(\/|$)/

const { t } = useI18n()
const route = useRoute()
const session = useSessionStore()
const consent = useConsent()
const toast = useToast()
const store = usePersisted('kd_push', { until: 0 })
// the debug dock opens it at once, whatever the conditions
const preview = useState('kd-push-preview', () => false)

// no Notification API (Safari on iPhone outside a home-screen app, in-app browsers) or already answered: nothing to ask
const askable = ref(false)
onMounted(() => (askable.value = 'Notification' in window && Notification.permission === 'default' && Date.now() >= store.value.until))

const eligible = computed(() => askable.value && session.isLoggedIn && !consent.open.value && !GAMES.test(route.path))
const ripe = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(eligible, (on) => {
  clearTimeout(timer)
  ripe.value = false
  if (on) timer = setTimeout(() => (ripe.value = true), DELAY_MS)
})
onBeforeUnmount(() => clearTimeout(timer))

const visible = computed(() => (ripe.value && eligible.value) || preview.value)

function close() {
  preview.value = false
  askable.value = false
}
function later() {
  store.value = { until: Date.now() + SNOOZE_MS }
  close()
}
async function subscribe() {
  close()
  if (!('Notification' in window)) return
  const answer = await Notification.requestPermission()
  if (answer === 'granted') toast.show(t('push.on'), 'success')
  else if (answer === 'denied') toast.show(t('push.blocked'))
}
</script>

<template>
  <Transition name="kd-push">
    <section
      v-if="visible"
      role="dialog"
      aria-labelledby="kd-push-title"
      class="kd-push fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 flex flex-col gap-3 rounded-5xl border border-neutral-5 bg-neutral-2 p-4 lg:inset-x-auto lg:top-44 lg:bottom-auto lg:left-6 lg:w-105"
    >
      <UiButton variant="ghost" size="s" icon="close" icon-only :aria-label="$t('common.close')" class="absolute top-2.5 right-2.5" @click="later" />
      <div class="flex flex-col gap-1">
        <h2 id="kd-push-title" class="type-16-caps flex items-center gap-2 pr-8">
          <UiIcon name="bell" :size="20" class="kd-push-bell text-brand-light" />
          {{ $t('push.title') }}
        </h2>
        <i18n-t keypath="push.text" tag="p" scope="global" class="type-14-regular text-neutral-11">
          <template #what><span class="text-neutral-15">{{ $t('push.what') }}</span></template>
        </i18n-t>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <UiButton variant="secondary" block @click="later">{{ $t('push.later') }}</UiButton>
        <UiButton block @click="subscribe">{{ $t('push.subscribe') }}</UiButton>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.kd-push {
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.6);
}
/* the bell rings once as the card arrives */
.kd-push-bell {
  transform-origin: 50% 10%;
  animation: kd-push-ring 900ms var(--ease-out) 300ms backwards;
}
@keyframes kd-push-ring {
  0%,
  100% {
    transform: rotate(0);
  }
  20% {
    transform: rotate(16deg);
  }
  40% {
    transform: rotate(-12deg);
  }
  60% {
    transform: rotate(8deg);
  }
  80% {
    transform: rotate(-4deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-push-bell {
    animation: none;
  }
}
.kd-push-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.kd-push-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-push-enter-from,
.kd-push-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
/* desktop: it comes down from the top */
@media (min-width: 64rem) {
  .kd-push-enter-from,
  .kd-push-leave-to {
    transform: translateY(-16px);
  }
}
</style>
