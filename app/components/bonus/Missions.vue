<script setup lang="ts">
import type { BonusClaimResponse, BonusesResponse, Mission } from '#shared/types/api'

// Daily missions: three small goals with a progress bar each; a finished one glows gold and pays on Claim.
// The timer says when the set resets. Each card links to where the goal is done.
const props = defineProps<{ missions: Mission[]; resetAt: string }>()
const emit = defineEmits<{ update: [bonuses: BonusesResponse] }>()
const session = useSessionStore()
const toast = useToast()
const { t } = useI18n()
const sfx = useSfx()
const fx = useForge()
const now = useClock(1000)

const LINK: Record<Mission['kind'], string> = { open_cases: '/', win_upgrade: '/upgrade', play_battle: '/pvp', spend: '/' }
const ICON: Record<Mission['kind'], string> = { open_cases: 'cases', win_upgrade: 'upgrade', play_battle: 'pvp', spend: 'wallet' }
const done = computed(() => props.missions.filter((m) => m.status === 'claimed').length)
const left = computed(() => countdown(props.resetAt, now.value))
const label = (m: Mission) => (m.kind === 'spend' ? `${formatCoins(m.progress)} / ${formatCoins(m.goal)}` : `${m.progress} / ${m.goal}`)

const cards = ref<Record<string, HTMLElement>>({})
const busy = ref<string | null>(null)
async function claim(m: Mission) {
  busy.value = m.id
  try {
    const res = await $fetch<BonusClaimResponse>(`/api/bonuses/missions/${m.id}/claim`, { method: 'POST' })
    if (session.user) session.user.balance = res.balance
    fx.at('kdCoins', cards.value[m.id], 1)
    sfx.reveal(2)
    emit('update', res.bonuses)
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex items-end justify-between gap-3">
      <h2 class="type-20-caps">{{ $t('bonus.missions') }} <span class="text-neutral-11 tabular-nums">{{ done }}/{{ missions.length }}</span></h2>
      <span class="type-12 flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-2 px-2.5 py-1.5 text-neutral-12 tabular-nums">
        <UiIcon name="history" :size="14" />{{ left }}
      </span>
    </div>
    <div class="grid gap-2 md:grid-cols-3">
      <div
        v-for="m in missions"
        :key="m.id"
        :ref="(el) => el && (cards[m.id] = el as HTMLElement)"
        class="kd-mission flex flex-col gap-3 rounded-3xl p-4"
        :class="`is-${m.status}`"
      >
        <div class="flex items-center gap-3">
          <span class="kd-mission-icon grid size-10 shrink-0 place-items-center rounded-xl"><UiIcon :name="ICON[m.kind]" :size="20" /></span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="type-14 truncate">{{ $t(`bonus.mission.${m.kind}`, { n: m.kind === 'spend' ? formatCoins(m.goal) : m.goal }) }}</span>
            <span class="type-12 text-neutral-11 tabular-nums">{{ label(m) }}</span>
          </span>
          <UiPrice :amount="m.reward" size="m" tone="coin" />
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-neutral-5">
          <div class="kd-mission-bar h-full rounded-full" :style="{ width: `${(m.progress / m.goal) * 100}%` }" />
        </div>
        <UiButton v-if="m.status === 'claimable'" variant="gold" size="s" block :loading="busy === m.id" @click="claim(m)">{{ $t('bonus.claim') }}</UiButton>
        <span v-else-if="m.status === 'claimed'" class="type-12-caps flex h-8 items-center justify-center gap-1 text-success"><UiIcon name="check-sm" :size="16" />{{ $t('bonus.claimed') }}</span>
        <NuxtLink v-else :to="LINK[m.kind]" class="kd-press type-12-caps flex h-8 items-center justify-center gap-1 rounded-lg text-neutral-12 hover:text-neutral-15">{{ $t('bonus.go') }}<UiIcon name="chevron-right" :size="14" /></NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.kd-mission {
  background: var(--color-neutral-2);
  transition:
    background-color var(--dur-slow) var(--ease-out),
    opacity var(--dur-slow) var(--ease-out);
}
.kd-mission-icon {
  background: var(--color-neutral-4);
  color: var(--color-neutral-13);
}
.kd-mission-bar {
  background: linear-gradient(90deg, var(--color-brand-base), var(--color-brand-light));
  transition: width 700ms var(--ease-out);
}
.kd-mission {
  position: relative;
}
.kd-mission.is-claimable {
  background: linear-gradient(180deg, rgb(228 174 57 / 0.16), var(--color-neutral-2) 70%);
}
.kd-mission.is-claimable::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 8px 24px -12px rgb(228 174 57 / 0.7);
  opacity: 0;
  pointer-events: none;
  animation: kd-glow-pulse 1.8s ease-in-out infinite;
}

.kd-mission.is-claimable .kd-mission-icon {
  background: rgb(228 174 57 / 0.2);
  color: var(--color-coin);
}
.kd-mission.is-claimable .kd-mission-bar {
  background: linear-gradient(90deg, var(--color-coin), #ffe58a);
}
.kd-mission.is-claimed {
  opacity: 0.6;
}
.kd-mission.is-claimed .kd-mission-bar {
  background: var(--color-success);
}
</style>
