<script setup lang="ts">
import type { EventResponse } from '#shared/types/api'

/*
 * Daily giveaway (#49, CS2Skin / DogDrop): one skin a day, one free ticket for playing a little on the event
 * cases today. The card shows what is at stake, how far the ticket is, the countdown and yesterday's winner.
 */
const props = defineProps<{ data: EventResponse; now: number }>()
const emit = defineEmits<{ update: [e: EventResponse] }>()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()
const { t } = useI18n()
const sfx = useSfx()

const g = computed(() => props.data.giveaway)
const ready = computed(() => g.value.played >= g.value.goal)
const left = computed(() => countdown(g.value.endsAt, props.now))

const joining = ref(false)
async function join() {
  if (!session.user) return ui.openSignIn()
  joining.value = true
  try {
    emit('update', await $fetch<EventResponse>('/api/event/giveaway/join', { method: 'POST' }))
    sfx.claim()
    toast.show(t('event.joined'), 'success')
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 rounded-5xl bg-neutral-2 p-4 lg:p-5">
    <div class="flex items-center justify-between gap-3">
      <span class="type-12-caps text-neutral-11">{{ $t('event.todayPrize') }}</span>
      <span class="type-12 flex items-center gap-1.5 rounded-lg bg-neutral-3 px-2.5 py-1.5 text-neutral-12 tabular-nums"><UiIcon name="history" :size="14" />{{ left }}</span>
    </div>
    <div class="flex items-center gap-4">
      <ItemArt :image="g.prize.image" :rarity="g.prize.rarity" :size="88" class="w-32 shrink-0" />
      <span class="flex min-w-0 flex-col gap-1">
        <span class="type-12 text-neutral-11">{{ g.prize.weapon }}</span>
        <span class="type-16-caps truncate" :style="{ color: RARITY_COLOR[g.prize.rarity] }">{{ g.prize.skin }}</span>
        <UiPrice :amount="g.prize.price" size="m" tone="coin" />
      </span>
    </div>

    <!-- The ticket: play the event cases a little today, then join -->
    <div v-if="session.user && !g.joined" class="flex flex-col gap-2">
      <div class="flex items-baseline justify-between gap-3">
        <span class="type-12-caps text-neutral-12">{{ ready ? $t('event.ticketReady') : $t('event.ticketNeed', { n: formatCoins(g.goal - g.played) }) }}</span>
        <span class="type-12 shrink-0 whitespace-nowrap text-neutral-11 tabular-nums">{{ formatCoins(Math.min(g.played, g.goal)) }} / {{ formatCoins(g.goal) }}</span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-neutral-5">
        <div class="kd-ticket-bar h-full rounded-full" :style="{ width: `${Math.min(100, (g.played / g.goal) * 100)}%` }" />
      </div>
    </div>
    <span v-if="g.joined" class="type-14-caps flex h-12 items-center justify-center gap-1.5 rounded-xl bg-success-24 text-success"><UiIcon name="check-sm" :size="18" />{{ $t('event.inGiveaway') }}</span>
    <UiButton v-else-if="!session.user || ready" variant="gold" size="l" block icon="trophy" :loading="joining" @click="join">{{ $t('event.join') }}</UiButton>
    <UiButton v-else to="#ladder" variant="secondary" size="l" block icon="cases">{{ $t('event.playEvent') }}</UiButton>

    <div class="flex items-center justify-between gap-3 border-t border-neutral-4 pt-3">
      <span class="type-12 text-neutral-11">{{ $t('event.entrants', { n: formatCount(g.entrants) }) }}</span>
      <span v-if="g.lastWinner" class="type-12 flex min-w-0 items-center gap-1.5 text-neutral-11">
        <UiAvatar :src="g.lastWinner.avatar" :size="18" />
        <span class="truncate">{{ $t('event.lastWinner', { name: g.lastWinner.nickname, item: g.lastWinner.item.skin }) }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.kd-ticket-bar {
  background: linear-gradient(90deg, rgb(139 92 246), rgb(87 227 137));
  transition: width 700ms var(--ease-out);
}
</style>
