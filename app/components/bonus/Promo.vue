<script setup lang="ts">
import type { PromoBody, PromoResponse } from '#shared/types/api'

// Promo code: one field and a button; a valid code credits the balance with a coin burst,
// a wrong one shakes the field and says why. `bare` drops the card for use inside a tray (the case page).
defineProps<{ bare?: boolean }>()
const emit = defineEmits<{ done: [] }>()
const session = useSessionStore()
const toast = useToast()
const { t } = useI18n()
const sfx = useSfx()
const fx = useForge()

const code = ref('')
const error = ref('')
const busy = ref(false)
const box = useTemplateRef<HTMLElement>('box')
async function redeem() {
  if (!code.value.trim()) return
  busy.value = true
  error.value = ''
  try {
    const body: PromoBody = { code: code.value }
    const res = await $fetch<PromoResponse>('/api/bonuses/promo', { method: 'POST', body })
    if (session.user) session.user.balance = res.balance
    toast.show(t('bonus.promoOk', { coins: formatCoins(res.credited) }), 'success')
    fx.at('kdCoins', box.value, 1)
    sfx.claim()
    code.value = ''
    emit('done')
  } catch (e) {
    const err = e as { data?: { message?: string }; statusMessage?: string }
    error.value = err?.data?.message ?? err?.statusMessage ?? t('common.error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div ref="box" class="flex flex-col gap-4" :class="!bare && 'rounded-5xl bg-neutral-2 p-5'">
    <span v-if="!bare" class="type-12-caps flex items-center gap-1 text-neutral-11" :title="$t('bonus.promoText')">{{ $t('bonus.promo') }}<UiIcon name="info" :size="14" /></span>
    <form class="mt-auto flex flex-col gap-2" @submit.prevent="redeem">
      <div class="flex gap-2">
        <UiInput id="promo-code" v-model="code" size="l" icon="bonuses" uppercase :error="!!error" :placeholder="$t('bonus.promoPlaceholder')" class="min-w-0 flex-1" @update:model-value="error = ''" />
        <UiButton type="submit" size="l" :loading="busy" :disabled="!code.trim()">{{ $t('bonus.redeem') }}</UiButton>
      </div>
      <Transition name="kd-promo-err">
        <span v-if="error" class="type-12-regular text-danger">{{ error }}</span>
      </Transition>
    </form>
  </div>
</template>

<style scoped>
.kd-promo-err-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    translate var(--dur-base) var(--ease-out);
}
.kd-promo-err-enter-from {
  opacity: 0;
  translate: 0 -4px;
}
</style>
