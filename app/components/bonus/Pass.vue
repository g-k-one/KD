<script setup lang="ts">
import type { PassResponse, PassTier } from '#shared/types/api'

// KURWA Pass (docs/ux-research-v3.md #6, Key-Drop's event pass): one point per coin played, ten tiers a season,
// each pays coins. The premium track is shown but closed — paid or earned is still the client's call.
const props = defineProps<{ data: PassResponse }>()
const emit = defineEmits<{ update: [p: PassResponse] }>()

const session = useSessionStore()
const toast = useToast()
const { t } = useI18n()
const sfx = useSfx()
const now = useClock(60_000)
const ends = computed(() => {
  const ms = Date.parse(props.data.endsAt) - now.value
  return ms > 0 ? t('pass.days', { n: Math.ceil(ms / 86_400_000) }, Math.ceil(ms / 86_400_000)) : ''
})
const next = computed(() => props.data.tiers.find((x) => x.status === 'locked') ?? null)
const prevPoints = computed(() => {
  const i = next.value ? props.data.tiers.indexOf(next.value) : -1
  return i > 0 ? props.data.tiers[i - 1]!.points : 0
})
const progress = computed(() => (next.value ? Math.min(100, ((props.data.points - prevPoints.value) / (next.value.points - prevPoints.value)) * 100) : 100))

const claiming = ref<number | null>(null)
async function claim(tier: PassTier) {
  claiming.value = tier.level
  try {
    const res = await $fetch<{ balance: number; pass: PassResponse }>(`/api/pass/tiers/${tier.level}/claim`, { method: 'POST' })
    if (session.user) session.user.balance = res.balance
    emit('update', res.pass)
    sfx.reveal(2)
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    claiming.value = null
  }
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="type-20-caps flex-1">{{ $t('pass.title') }}</h2>
      <span class="type-12-caps text-neutral-11">{{ data.season }} · {{ ends }}</span>
    </div>
    <div class="flex flex-col gap-4 rounded-5xl bg-neutral-2 p-4">
      <!-- Points to the next tier -->
      <div class="flex flex-col gap-2">
        <div class="flex items-baseline justify-between gap-3">
          <span class="type-14-caps">{{ $t('pass.points', { n: data.points }) }}</span>
          <span v-if="next" class="type-12-regular text-neutral-11">{{ $t('pass.toNext', { n: next.points - data.points, tier: next.level }) }}</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-neutral-4">
          <div class="bg-brand-gradient h-full rounded-full transition-[width] duration-700" :style="{ width: `${progress}%` }" />
        </div>
      </div>

      <!-- Tiers: free track on top, the closed premium track under it -->
      <div class="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4">
        <div v-for="tier in data.tiers" :key="tier.level" class="flex w-28 shrink-0 snap-start flex-col gap-2">
          <div
            class="kd-tier flex flex-col items-center gap-2 rounded-2xl border p-3"
            :class="{ 'is-ready': tier.status === 'claimable', 'is-done': tier.status === 'claimed' }"
          >
            <span class="type-10-caps text-neutral-11">{{ $t('pass.tier', { n: tier.level }) }}</span>
            <UiPrice :amount="tier.reward" size="m" tone="coin" />
            <UiButton
              v-if="tier.status === 'claimable'"
              size="s"
              block
              :loading="claiming === tier.level"
              @click="claim(tier)"
            >
              {{ $t('bonus.claim') }}
            </UiButton>
            <span v-else class="type-10-caps flex h-8 items-center" :class="tier.status === 'claimed' ? 'text-success' : 'text-neutral-10'">
              {{ tier.status === 'claimed' ? $t('bonus.claimed') : $t('pass.pts', { n: tier.points }) }}
            </span>
          </div>
          <div class="flex flex-col items-center gap-1 rounded-2xl bg-neutral-1/50 p-2 opacity-60">
            <span class="type-10-caps flex items-center gap-1 text-coin"><UiIcon name="crown" :size="12" />{{ $t('pass.premium') }}</span>
            <UiPrice :amount="tier.premiumReward" size="s" tone="muted" />
          </div>
        </div>
      </div>
      <p class="type-12-regular text-neutral-11">{{ $t('pass.how') }}</p>
    </div>
  </section>
</template>

<style scoped>
.kd-tier {
  background: var(--color-neutral-3);
  border-color: var(--color-neutral-4);
}
.kd-tier.is-ready {
  border-color: rgb(255 95 31 / 0.5);
  background: var(--color-brand-24);
}
.kd-tier.is-done {
  opacity: 0.6;
}
</style>
