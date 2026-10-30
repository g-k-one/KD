<script setup lang="ts">
import type { ContactBody, ContactResponse } from '#shared/types/api'

// Contact: a message to support on the left, the other ways to reach us on the right. The channels are placeholders
// until the real ones are set up.
useHead({ title: 'Contact · KurwaDROP' })
const { t } = useI18n()
const toast = useToast()
const session = useSessionStore()

const topics = computed(() => (['payment', 'withdrawal', 'game', 'account', 'other'] as const).map((v) => ({ value: v, label: t(`help.topics.${v}`) })))
const topic = ref<ContactBody['topic']>('payment')
const email = ref('')
const message = ref('')
const sending = ref(false)
const ticket = ref('')

const emailOk = computed(() => /^\S+@\S+\.\S+$/.test(email.value.trim()))
const messageOk = computed(() => message.value.trim().length >= 10)
// the button says what is still missing
const missing = computed(() => (!emailOk.value ? 'help.needEmail' : !messageOk.value ? 'help.needMessage' : ''))

const CHANNELS = [
  { key: 'email', icon: 'm-mail', value: 'support@kurwadrop.com', href: 'mailto:support@kurwadrop.com' },
  { key: 'telegram', icon: 'telegram', value: '@kurwadrop_support', href: '#' },
  { key: 'discord', icon: 'discord', value: 'discord.gg/kurwadrop', href: '#' },
]

async function send() {
  sending.value = true
  try {
    const body: ContactBody = { topic: topic.value, email: email.value.trim(), message: message.value.trim(), userId: session.user?.id }
    ticket.value = (await $fetch<ContactResponse>('/api/contact', { method: 'POST', body })).ticketId
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    sending.value = false
  }
}
function again() {
  ticket.value = ''
  message.value = ''
}
</script>

<template>
  <div class="kd-page kd-page-top gap-6">
    <UiPageBar
      class="-mb-2"
      :title="t('nav.contact')"
      :left="[{ label: t('case.allCases'), icon: 'arrow-left', to: '/' }]"
      :right="[{ label: t('nav.faq'), icon: 'info', to: '/faq' }]"
    />

    <div class="grid items-start gap-4 lg:grid-cols-[1fr_440px] lg:gap-5">
      <!-- the same panel as the deposit's: a header row over a hairline, then the content -->
      <section class="kd-panel">
        <UiPanelHead icon="m-mail" :title="t('help.writeTitle')" tag="h2" />

        <Transition name="kd-sent" mode="out-in">
          <div v-if="ticket" key="sent" class="flex flex-col items-center gap-4 p-6 text-center lg:p-10">
            <span class="kd-sent-ok grid size-16 place-items-center rounded-full"><UiIcon name="check" :size="32" /></span>
            <h3 class="type-20-caps">{{ t('help.sentTitle') }}</h3>
            <p class="type-14-regular max-w-96 text-neutral-12">{{ t('help.sentHint', { ticket, email }) }}</p>
            <UiButton variant="secondary" size="m" @click="again">{{ t('help.sendAnother') }}</UiButton>
          </div>

          <form v-else key="form" class="flex flex-col gap-4 p-4 lg:p-6" @submit.prevent="missing || send()">
            <!-- signed in: the account's id goes with the message, filled in and locked, so support knows who writes -->
            <div class="grid gap-4" :class="session.user && 'sm:grid-cols-2'">
              <UiSelect v-model="topic" :label="t('help.topic')" :options="topics" />
              <div v-if="session.user" class="flex flex-col gap-2">
                <span class="type-12-caps text-neutral-12">{{ t('help.accountId') }}</span>
                <UiInput :model-value="session.user.id" icon="lock" disabled />
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <label for="contact-email" class="type-12-caps text-neutral-12">{{ t('help.email') }}</label>
              <UiInput id="contact-email" v-model="email" size="l" type="email" inputmode="email" :error="!!email && !emailOk" placeholder="you@example.com" />
            </div>
            <div class="flex flex-col gap-2">
              <label for="contact-message" class="type-12-caps text-neutral-12">{{ t('help.message') }}</label>
              <UiTextarea id="contact-message" v-model="message" :placeholder="t('help.messageHint')" />
            </div>
            <UiButton type="submit" size="l" block :loading="sending" :disabled="!!missing">{{ t(missing || 'help.send') }}</UiButton>
          </form>
        </Transition>
      </section>

      <div class="flex flex-col gap-4 lg:gap-5">
        <ul class="flex flex-col gap-1 kd-panel p-2">
          <li v-for="c in CHANNELS" :key="c.key">
            <a :href="c.href" class="kd-channel kd-press flex items-center gap-3 rounded-3xl p-2">
              <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-neutral-3 text-neutral-13"><UiIcon :name="c.icon" :size="20" /></span>
              <span class="flex min-w-0 flex-col">
                <span class="type-12-caps text-neutral-11">{{ t(`help.channels.${c.key}`) }}</span>
                <span class="type-14 truncate">{{ c.value }}</span>
              </span>
            </a>
          </li>
        </ul>
        <p class="type-14-regular kd-panel px-4 py-3 text-neutral-12 lg:px-6 lg:py-4">{{ t('help.replyTime') }}</p>
        <p class="type-12-regular px-4 text-neutral-10 lg:px-6">{{ t('deposit.operator') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kd-sent-ok {
  background: rgb(var(--success-rgb) / 0.16);
  color: var(--color-success);
}
.kd-channel {
  transition: background-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-channel:hover {
    background: var(--color-white-4);
  }
}
.kd-sent-enter-active,
.kd-sent-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-sent-enter-from,
.kd-sent-leave-to {
  opacity: 0;
}
</style>
