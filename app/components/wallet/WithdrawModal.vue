<script setup lang="ts">
import type { InventoryItem, TradeUrlBody, WithdrawResponse } from '#shared/types/api'

/*
 * Withdraw to Steam: skins leave one at a time, each in its own trade offer.
 *   1. the skin, big;
 *   2. the trade link — the same field as on the profile, filled in once it is saved; a new one is saved on send;
 *   3. sent — the offer number and a 15-minute countdown to accept it in Steam.
 */
const open = defineModel<boolean>({ required: true })
/** inline: a step of the inventory's window; the secondary button goes back to it */
const props = defineProps<{ item?: InventoryItem; inline?: boolean }>()
const emit = defineEmits<{ done: [uids: string[]] }>()

const session = useSessionStore()
const toast = useToast()
const { t } = useI18n()

const TRADE_RE = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]{6,}$/
const link = ref('')
const saved = computed(() => session.user?.tradeUrl ?? null)
const valid = computed(() => TRADE_RE.test(link.value.trim()))
const offer = ref<WithdrawResponse['offer'] | null>(null)
const sending = ref(false)

watch(
  open,
  (v) => {
    if (!v) return
    offer.value = null
    link.value = saved.value ?? ''
  },
  { immediate: true },
)

async function send() {
  sending.value = true
  try {
    if (link.value.trim() !== saved.value) {
      const body: TradeUrlBody = { tradeUrl: link.value.trim() }
      const res = await $fetch<{ tradeUrl: string }>('/api/me/trade-url', { method: 'PUT', body })
      if (session.user) session.user.tradeUrl = res.tradeUrl
    }
    const res = await $fetch<WithdrawResponse>('/api/inventory/withdraw', { method: 'POST', body: { uids: [props.item!.uid] } })
    offer.value = res.offer
    emit('done', res.withdrawn)
    session.refresh()
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    sending.value = false
  }
}

// Countdown to the offer's expiry
const now = ref(Date.now())
useIntervalFn(() => (now.value = Date.now()), 1000)
const left = computed(() => {
  if (!offer.value) return ''
  const s = Math.max(0, Math.floor((Date.parse(offer.value.expiresAt) - now.value) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
</script>

<template>
  <UiModal v-model="open" :inline="inline" :title="offer ? $t('withdraw.sentTitle') : $t('withdraw.title')" :description="offer ? undefined : $t('withdraw.hint')" :width="520">
    <Transition name="kd-wd" mode="out-in">
      <!-- Sent -->
      <div v-if="offer" key="sent" class="flex flex-col items-center gap-4 py-2 text-center">
        <span class="kd-wd-ok grid size-16 place-items-center rounded-full"><UiIcon name="steam" :size="32" /></span>
        <p class="type-14-regular max-w-80 text-neutral-12">{{ $t('withdraw.sentHint') }}</p>
        <div class="grid w-full grid-cols-2 gap-2">
          <div class="flex flex-col gap-1 rounded-2xl bg-neutral-3 p-3">
            <span class="type-10-caps text-neutral-11">{{ $t('withdraw.offer') }}</span>
            <span class="type-14 font-mono">#{{ offer.id }}</span>
          </div>
          <div class="flex flex-col gap-1 rounded-2xl bg-neutral-3 p-3">
            <span class="type-10-caps text-neutral-11">{{ $t('withdraw.expires') }}</span>
            <span class="type-14 text-coin tabular-nums">{{ left }}</span>
          </div>
        </div>
      </div>

      <!-- Review -->
      <div v-else key="form" class="flex flex-col gap-6">
        <WalletSkinHero v-if="item" :item="item" />

        <div class="flex flex-col gap-2">
          <span class="type-12-caps text-neutral-11">{{ $t('withdraw.tradeLink') }}</span>
          <UiInput id="trade-link" v-model="link" size="l" icon="steam" class="kd-private" inputmode="url" clearable :error="!!link && !valid" :placeholder="$t('withdraw.linkPlaceholder')" />
          <span v-if="!saved" class="type-12-regular text-neutral-11">
            {{ $t('withdraw.whereLink') }}
            <a href="https://steamcommunity.com/my/tradeoffers/privacy#trade_offer_access_url" target="_blank" rel="noopener" class="text-brand-light underline-offset-2 hover:underline">{{ $t('withdraw.openSteam') }}</a>
          </span>
        </div>
      </div>
    </Transition>

    <template #actions>
      <UiButton v-if="offer" size="l" block @click="open = false">{{ $t('upgrade.done') }}</UiButton>
      <template v-else>
        <UiButton variant="secondary" size="l" class="flex-1" @click="open = false">{{ $t(inline ? 'common.back' : 'common.cancel') }}</UiButton>
        <!-- until there is a link it says what is missing; phones: across, over Back, so a long sum fits -->
        <UiButton size="l" :icon="valid ? 'steam' : undefined" class="flex-[2] max-sm:order-first max-sm:basis-full" :loading="sending" :disabled="!valid" @click="send">
          <template v-if="valid">
            {{ $t('withdraw.short') }}
            <span v-if="item" class="btn-value"><UiPrice :amount="item.price" size="m" tone="inverse" /></span>
          </template>
          <template v-else>{{ $t(link ? 'withdraw.checkLink' : 'withdraw.needLink') }}</template>
        </UiButton>
      </template>
    </template>
  </UiModal>
</template>

<style scoped>
.kd-wd-ok {
  background: rgb(18 183 106 / 0.16);
  color: var(--color-success);
  animation: kd-wd-pop 600ms var(--ease-spring) both;
}
@keyframes kd-wd-pop {
  0% {
    scale: 0.4;
    opacity: 0;
  }
}
.kd-wd-enter-active,
.kd-wd-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    translate var(--dur-base) var(--ease-out);
}
.kd-wd-enter-from {
  opacity: 0;
  translate: 0 8px;
}
.kd-wd-leave-to {
  opacity: 0;
}
</style>
