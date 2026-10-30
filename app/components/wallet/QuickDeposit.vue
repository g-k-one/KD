<script setup lang="ts">
import type { DepositQuote, DepositResponse, FiatCurrency, PaymentMethod } from '#shared/types/api'

/*
 * Quick top-up over the page (player audit D7): opened when a case or a battle costs more than the balance.
 * The missing amount is already filled in, rounded up to a round number; one tap on Pay and the player
 * is back where they were. The full /deposit page stays for promo codes, countries and limits.
 */
const ui = useUiStore()
const session = useSessionStore()
const toast = useToast()
const { t } = useI18n()

const open = computed({ get: () => ui.depositOpen, set: (v: boolean) => (ui.depositOpen = v) })
const { data: methodsData } = useFetch<{ methods: PaymentMethod[] }>('/api/deposit/methods', { key: 'deposit-methods', lazy: true, server: false })
const methods = computed(() => (methodsData.value?.methods ?? []).slice(0, 4))

// Same rate table as the backend quote (1 coin ≈ 1 USD); only used to pre-fill the amount
const RATE: Record<FiatCurrency, number> = { USD: 1, EUR: 1.08, PLN: 0.249 }
const SIGN: Record<FiatCurrency, string> = { PLN: 'zł', EUR: '€', USD: '$' }
const currency = ref<FiatCurrency>('PLN')
const methodId = ref('blik')
const amount = ref(50)

const needFiat = computed(() => {
  const coins = (ui.depositNeed ?? 0) / 100
  const raw = coins / RATE[currency.value]
  return Math.max(10, Math.ceil(raw / 5) * 5)
})
const presets = computed(() => [...new Set([needFiat.value, 50, 100, 200, 500])].filter((v) => v >= needFiat.value).slice(0, 4))
watch(open, (v) => v && (amount.value = needFiat.value))

const { data: quote } = useFetch<DepositQuote>('/api/deposit/quote', {
  key: 'quick-quote',
  query: computed(() => ({ amount: amount.value, currency: currency.value, methodId: methodId.value })),
  lazy: true,
  server: false,
})
const enough = computed(() => !ui.depositNeed || (quote.value?.total ?? 0) >= ui.depositNeed)

const paying = ref(false)
async function pay() {
  if (!session.user) return ui.openSignIn()
  paying.value = true
  try {
    const res = await $fetch<DepositResponse>('/api/deposit', { method: 'POST', body: { methodId: methodId.value, amount: amount.value, currency: currency.value } })
    session.user.balance = res.balance
    toast.show(t('deposit.success', { coins: formatCoins(res.credited) }), 'success')
    open.value = false
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <UiModal v-model="open" :title="$t('quick.title')" :width="480">
    <div v-if="ui.depositNeed" class="-mt-2 flex items-center justify-center gap-2 text-center">
      <span class="type-14-regular text-neutral-12">{{ $t('quick.need') }}</span>
      <UiPrice :amount="ui.depositNeed" size="l" tone="coin" />
    </div>

    <div class="grid grid-cols-4 gap-2">
      <button
        v-for="m in methods"
        :key="m.id"
        type="button"
        class="kd-qmethod kd-press relative flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border"
        :aria-pressed="methodId === m.id"
        @click="methodId = m.id"
      >
        <img :src="m.logo" :alt="m.name" class="h-6 max-w-[80%] object-contain" />
        <span v-if="m.bonusBp" class="type-10-caps text-success">+{{ m.bonusBp / 100 }}%</span>
      </button>
    </div>

    <div class="flex flex-col gap-2">
      <div class="grid grid-cols-4 gap-2">
        <UiChip v-for="p in presets" :key="p" size="m" :active="amount === p" @click="amount = p">{{ p }} {{ SIGN[currency] }}</UiChip>
      </div>
      <div class="flex gap-2">
        <UiInput id="quick-amount" v-model.number="amount" size="l" type="number" inputmode="decimal" class="min-w-0 flex-1">
          <template #trailing><span class="type-14 text-neutral-11">{{ SIGN[currency] }}</span></template>
        </UiInput>
        <div class="flex rounded-xl bg-neutral-3 p-1">
          <button
            v-for="c in (['PLN', 'EUR', 'USD'] as const)"
            :key="c"
            type="button"
            class="type-12-caps kd-press rounded-lg px-2.5"
            :class="currency === c ? 'bg-neutral-6 text-neutral-15' : 'text-neutral-11'"
            @click="currency = c"
          >
            {{ c }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between rounded-2xl bg-neutral-3 px-4 py-3">
      <span class="type-12-caps text-neutral-11">{{ $t('deposit.youReceive') }}</span>
      <UiPrice :amount="quote?.total ?? 0" size="xl" :tone="enough ? 'success' : 'default'" />
    </div>

    <template #actions>
      <div class="flex w-full flex-col gap-3">
        <UiButton size="l" block :loading="paying" :disabled="!amount" @click="pay">{{ $t('deposit.pay', { amount: `${amount} ${SIGN[currency]}` }) }}</UiButton>
        <NuxtLink to="/deposit" class="type-12-caps text-center text-neutral-11 hover:text-neutral-15" @click.capture="open = false">{{ $t('quick.allMethods') }}</NuxtLink>
      </div>
    </template>
  </UiModal>
</template>

<style scoped>
.kd-qmethod {
  background: var(--color-neutral-3);
  border-color: var(--color-neutral-4);
}
.kd-qmethod[aria-pressed='true'] {
  background: var(--color-brand-24);
  border-color: rgb(var(--brand-rgb) / 0.35);
}
</style>
