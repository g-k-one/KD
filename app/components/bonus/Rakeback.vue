<script setup lang="ts">
import type { BonusClaimResponse, BonusesResponse, RakebackInfo } from '#shared/types/api'

// Rakeback card: the share of every coin played that comes back, growing with the level.
// The pending amount counts up live; Claim pays it out with a coin burst.
const props = defineProps<{ info: RakebackInfo }>()
const emit = defineEmits<{ update: [bonuses: BonusesResponse] }>()
const session = useSessionStore()
const toast = useToast()
const { t } = useI18n()
const sfx = useSfx()
const fx = useForge()

const pendingSrc = computed(() => props.info.pending)
const pendingShown = useTransition(pendingSrc, { duration: 700, transition: [0.22, 1, 0.36, 1] })
const pct = (bp: number) => `${(bp / 100).toFixed(bp % 100 ? 2 : 0)}%`
const card = useTemplateRef<HTMLElement>('card')
const busy = ref(false)
async function claim() {
  busy.value = true
  try {
    const res = await $fetch<BonusClaimResponse>('/api/bonuses/rakeback/claim', { method: 'POST' })
    if (session.user) session.user.balance = res.balance
    fx.at('kdCoins', card.value, 1.2)
    sfx.reveal(2)
    emit('update', res.bonuses)
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div ref="card" class="kd-rb relative flex flex-col gap-4 overflow-hidden rounded-5xl p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <span class="type-12-caps flex items-center gap-1 text-neutral-11" :title="$t('bonus.rakebackText')">{{ $t('bonus.rakeback') }}<UiIcon name="info" :size="14" /></span>
        <span class="type-28 text-coin tabular-nums">{{ pct(info.rateBp) }}</span>
      </div>
      <span class="kd-rb-badge grid size-12 shrink-0 place-items-center rounded-2xl"><UiIcon name="refresh" :size="22" /></span>
    </div>
    <div v-if="info.next" class="flex flex-col gap-1.5">
      <div class="type-12 flex justify-between text-neutral-12">
        <span>LVL {{ session.user?.level ?? 0 }}</span>
        <span class="text-coin tabular-nums">{{ pct(info.next.rateBp) }} · LVL {{ info.next.level }}</span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-neutral-5">
        <div class="h-full rounded-full bg-coin transition-[width] duration-700" :style="{ width: `${Math.min(100, (((session.user?.level ?? 0) % 10) / 10) * 100)}%` }" />
      </div>
    </div>
    <div class="mt-auto flex items-center justify-between gap-3 rounded-2xl bg-neutral-1/50 p-3">
      <div class="flex flex-col gap-0.5">
        <span class="type-10-caps text-neutral-11">{{ $t('bonus.rakebackPending') }}</span>
        <UiPrice :amount="Math.round(pendingShown)" size="l" tone="coin" />
      </div>
      <UiButton variant="gold" size="m" :loading="busy" :disabled="info.pending < 1" @click="claim">{{ $t('bonus.claim') }}</UiButton>
    </div>
  </div>
</template>

<style scoped>
.kd-rb {
  background:
    radial-gradient(120% 100% at 100% 0%, rgb(253 176 34 / 0.14), transparent 55%),
    var(--color-neutral-2);
}
.kd-rb-badge {
  background: rgb(253 176 34 / 0.14);
  color: var(--color-coin);
  animation: kd-rb-turn 6s linear infinite;
}
@keyframes kd-rb-turn {
  to {
    rotate: 360deg;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-rb-badge {
    animation: none;
  }
}
</style>
