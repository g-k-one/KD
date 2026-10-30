<script setup lang="ts">
import type { DepositQuote, DepositResponse, FiatCurrency, PaymentMethod, PromoResponse } from '#shared/types/api'

// Figma "Deposit": pick a method, enter an amount in fiat, see exactly how many coins arrive.
useHead({ title: 'Deposit · KurwaDROP' })
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()

// lazy on a tap from elsewhere: the page shows at once, the methods and the summary keep skeletons until they come in
const methodsReq = useFetch<{ methods: PaymentMethod[] }>('/api/deposit/methods', { key: 'deposit-methods', lazy: true })
if (import.meta.server) await methodsReq
const { data: methodsData } = methodsReq
const methods = computed(() => methodsData.value?.methods ?? [])

const CURRENCY_SIGN: Record<FiatCurrency, string> = { PLN: 'zł', EUR: '€', USD: '$' }
const currencyOptions = (['PLN', 'EUR', 'USD'] as const).map((c) => ({ value: c, label: `${c} ${CURRENCY_SIGN[c]}` }))
const countryOptions = [
  { value: 'PL', label: 'Poland', image: '/img/flags/pl.svg' },
  { value: 'DE', label: 'Germany', image: '/img/flags/de.svg' },
  { value: 'CZ', label: 'Czechia', image: '/img/flags/cz.svg' },
]

const country = ref('PL')
const countryFlag = computed(() => countryOptions.find((o) => o.value === country.value)?.image)
const currency = ref<FiatCurrency>('PLN')
const currencyLabel = computed(() => currencyOptions.find((o) => o.value === currency.value)?.label)
const methodId = ref('blik')
const amount = ref(200)
const PRESETS = [20, 50, 100, 200, 500, 1000]

const promoInput = ref('KURWA10')
const promo = ref<PromoResponse | null>(null)
const promoError = ref(false)
// unticked: an agreement ticked for the player is not one
const agree = ref(false)
const paying = ref(false)

const method = computed(() => methods.value.find((m) => m.id === methodId.value))

const quoteKey = computed(() => `${amount.value}-${currency.value}-${methodId.value}-${promo.value?.code ?? ''}`)
const quoteReq = useFetch<DepositQuote>('/api/deposit/quote', {
  key: 'deposit-quote',
  lazy: true,
  query: computed(() => ({ amount: amount.value || 0, currency: currency.value, methodId: methodId.value, promoCode: promo.value?.code })),
  watch: [quoteKey],
})
if (import.meta.server) await quoteReq
const { data: quote } = quoteReq

async function applyPromo() {
  promoError.value = false
  try {
    promo.value = await $fetch<PromoResponse>('/api/deposit/promo', { method: 'POST', body: { code: promoInput.value } })
  } catch {
    promo.value = null
    promoError.value = true
  }
}
function clearPromo() {
  promo.value = null
  promoInput.value = ''
  promoError.value = false
}
onMounted(() => promoInput.value && applyPromo())

const fmtFiat = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/,/g, ' ')} ${currency.value}`
const limits = (m: PaymentMethod) =>
  m.max ? t('deposit.limits', { min: m.min, max: `${m.max.toLocaleString('en-US').replace(/,/g, ' ')} ${currency.value}` }) : t('deposit.limitsFrom', { min: `${m.min} ${currency.value}` })

async function pay() {
  if (!session.user) return ui.openSignIn()
  paying.value = true
  try {
    const res = await $fetch<DepositResponse>('/api/deposit', {
      method: 'POST',
      body: { methodId: methodId.value, amount: amount.value, currency: currency.value, promoCode: promo.value?.code },
    })
    session.user.balance = res.balance
    toast.show(t('deposit.success', { coins: formatCoins(res.credited) }), 'success')
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:px-0 lg:pt-10">
    <!-- the same bar as the games': back and this page's own history on the left; on the right where to ask about a payment -->
    <UiPageBar
      class="-mb-2"
      :title="$t('deposit.title')"
      :left="[
        { label: $t('case.allCases'), icon: 'arrow-left', to: '/' },
        { label: $t('upgrade.history'), icon: 'history', to: '/profile?tab=history&game=deposit' },
      ]"
      :right="[{ label: $t('nav.contact'), icon: 'info', to: '/contact' }]"
    />

    <!-- Phones: methods, the amount, then the notices at the bottom (they used to sit between the methods and the
         amount, a long scroll to the field); desktop keeps them under the methods, the summary spanning both rows -->
    <div class="grid items-start gap-4 lg:grid-cols-[1fr_440px] lg:grid-rows-[auto_1fr] lg:gap-5">
      <!-- Methods -->
      <div class="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
        <div class="rounded-5xl bg-neutral-2">
          <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
            <UiIcon name="wallet" :size="20" class="text-neutral-13 lg:!size-6" />
            <span class="type-14 lg:type-16-medium flex-1">{{ $t('deposit.paymentMethod') }}</span>
            <span class="type-12-caps text-neutral-11 max-sm:hidden">{{ $t('deposit.country') }}:</span>
            <UiSelect v-model="country" :options="countryOptions" menu-width="fit" class="kd-inline-select w-34">
              <template #leading><img :src="countryFlag" alt="" class="h-3.5 w-5 shrink-0" /></template>
            </UiSelect>
          </div>
          <!-- phones: three small cards a row, so every method shows without a long scroll -->
          <div class="grid grid-cols-3 gap-2 p-3 lg:gap-3 lg:p-4" role="radiogroup" :aria-label="$t('deposit.paymentMethod')">
            <span v-for="n in methodsData ? 0 : 6" :key="`s${n}`" class="kd-skeleton h-[88px] rounded-xl sm:h-[130px] lg:h-34 lg:rounded-lg" aria-hidden="true" />
            <button
              v-for="m in methods"
              :key="m.id"
              type="button"
              role="radio"
              :aria-checked="methodId === m.id"
              class="kd-method kd-press group relative flex flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 sm:gap-4 sm:px-3 sm:py-5 lg:h-34 lg:rounded-lg"
              @click="methodId = m.id"
            >
              <span class="grid h-10 w-full max-w-32 place-items-center rounded-sm bg-white-8 transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-14 lg:h-16">
                <img :src="m.logo" :alt="m.name" class="h-6 w-10 sm:h-8 sm:w-12" />
              </span>
              <span class="type-12-regular max-sm:text-[11px] max-sm:leading-4" :class="methodId === m.id ? 'text-neutral-15' : 'text-neutral-11'">{{ limits(m) }}</span>
              <span v-if="m.bonusBp" class="type-12 absolute top-[7px] right-[7px] rounded-sm bg-neutral-15 px-2 py-0.5 text-neutral-1 max-sm:top-1 max-sm:right-1 max-sm:px-1 max-sm:py-0 max-sm:text-[10px]">+{{ m.bonusBp / 100 }}%</span>
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4 max-lg:order-last lg:col-start-1 lg:row-start-2">
        <p class="type-14-regular rounded-5xl bg-neutral-2 px-4 py-3 text-neutral-12">
          <!-- one line and the rules (the long version lives in the AML policy) -->
          <i18n-t keypath="deposit.sharedWarning" scope="global">
            <template #notAllow><span class="text-danger">{{ $t('deposit.notAllow') }}</span></template>
            <template #rules><NuxtLink to="/aml" class="text-brand-light underline-offset-2 hover:underline">{{ $t('deposit.rules') }}</NuxtLink></template>
          </i18n-t>
        </p>
        <div class="type-12-regular flex flex-col gap-2 px-2 text-neutral-10 lg:type-14-regular lg:gap-1.5 lg:px-4">
          <span>{{ $t('deposit.feeNote') }}</span>
          <span>{{ $t('deposit.licensedNote') }}</span>
        </div>
      </div>

      <!-- Amount & summary -->
      <div class="flex flex-col gap-4 rounded-5xl bg-neutral-2 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
          <UiIcon name="coins" :size="20" class="text-neutral-13 lg:!size-6" />
          <span class="type-14 lg:type-16-medium flex-1">{{ $t('deposit.amount') }}</span>
          <span class="type-12-caps text-neutral-11">{{ $t('deposit.currency') }}:</span>
          <UiSelect v-model="currency" :options="currencyOptions" menu-width="fit" class="kd-inline-select w-24" />
        </div>
        <div class="flex flex-col gap-4 px-4 lg:px-6 lg:pt-2">
          <!-- the sum and its currency read as one, "1000 PLN zł", in the middle of the field; the picker is in the header -->
          <UiInput id="deposit-amount" v-model.number="amount" size="l" type="number" inputmode="decimal" class="kd-amount" :style="{ '--len': String(amount ?? '').length || 1 }">
            <template #trailing>
              <span class="type-12-caps text-neutral-11">{{ currencyLabel }}</span>
            </template>
          </UiInput>
          <div class="grid grid-cols-6 gap-1 lg:gap-1.5">
            <UiChip v-for="p in PRESETS" :key="p" :active="amount === p" class="w-full" @click="amount = p">{{ p.toLocaleString('en-US').replace(',', ' ') }}</UiChip>
          </div>

          <div class="flex flex-col gap-2">
            <span class="type-12-caps text-neutral-12">{{ $t('deposit.promoCode') }}</span>
            <div class="flex gap-2">
              <UiInput id="promo" v-model="promoInput" size="l" icon="bonuses" uppercase clearable :error="!!promoError" class="flex-1" @enter="applyPromo" @clear="clearPromo" />
              <UiButton :variant="promo ? 'success' : 'secondary'" size="l" class="w-30 lg:w-[111px]" :disabled="!promoInput" @click="applyPromo">
                {{ promo ? $t('deposit.applied') : $t('deposit.apply') }}
              </UiButton>
            </div>
            <span v-if="promoError" class="type-12-regular text-danger">{{ $t('deposit.promoInvalid') }}</span>
          </div>

          <span v-if="!quote" class="kd-skeleton h-[150px] rounded-2xl" aria-hidden="true" />
          <div v-else class="flex flex-col gap-3 rounded-2xl bg-neutral-3 p-4">
            <div class="type-14-regular flex justify-between text-neutral-13">
              <span>{{ $t('deposit.deposit') }}</span>
              <UiPrice :amount="quote.coins" />
            </div>
            <div v-if="quote.methodBonus" class="type-14-regular flex justify-between text-neutral-13">
              <span>{{ $t('deposit.methodBonus', { method: method?.name, bonus: (method?.bonusBp ?? 0) / 100 }) }}</span>
              <UiPrice :amount="quote.methodBonus" tone="success" />
            </div>
            <div v-if="quote.promoBonus && promo" class="type-14-regular flex justify-between text-neutral-13">
              <span>{{ $t('deposit.promoBonus', { code: promo.code, bonus: promo.bonusBp / 100 }) }}</span>
              <UiPrice :amount="quote.promoBonus" tone="success" />
            </div>
            <div class="flex items-center justify-between border-t border-neutral-5 pt-3">
              <span class="type-12-caps text-neutral-11">{{ $t('deposit.youReceive') }}</span>
              <UiPrice :key="quote.total" :amount="quote.total" size="xxl" class="kd-total" />
            </div>
          </div>

          <UiCheckbox v-model="agree">
            {{ $t('deposit.agree') }} <NuxtLink to="/refund" class="text-brand-light hover:underline">{{ $t('deposit.refundPolicy') }}</NuxtLink>
          </UiCheckbox>
          <UiButton size="l" block :disabled="!agree || !amount" :loading="paying" @click="pay">
            {{ $t('deposit.pay', { amount: fmtFiat(amount || 0) }) }}
          </UiButton>
        </div>
        <p class="type-12-regular lg:type-14-regular px-4 pb-4 text-neutral-10 lg:px-6 lg:pb-6">{{ $t('deposit.operator') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kd-amount {
  justify-content: center;
}
/* the input is as wide as its digits (--len), so the currency stands right after them */
.kd-amount :deep(input) {
  flex: none;
  width: calc(var(--len) * 1ch + 8px);
  max-width: 50%;
  text-align: right;
  font-size: 16px;
  font-weight: 600;
  -moz-appearance: textfield;
}
.kd-amount :deep(input::-webkit-inner-spin-button) {
  display: none;
}
/* The total pops each time the quote changes, so the user sees the bonus land. */
.kd-total {
  animation: kd-total-pop var(--dur-slow) var(--ease-spring);
}
@keyframes kd-total-pop {
  from {
    transform: scale(0.92);
    opacity: 0.6;
  }
}
:deep(.kd-inline-select > button) {
  height: 32px;
  border-color: transparent;
  background: transparent;
  padding-inline: 6px;
}
:deep(.kd-inline-select .type-14) {
  font-size: 12px;
  text-transform: uppercase;
}
/* The colours of UiSegmented (the case amount's ×1…×5): neutral-3 cells, the chosen one neutral-6 with its top light */
.kd-method {
  background: var(--color-neutral-3);
  border-color: transparent;
  transition: background-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-method:hover {
    background: var(--color-neutral-4);
  }
}
.kd-method[aria-checked='true'] {
  background: var(--color-neutral-6);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08);
}
</style>
