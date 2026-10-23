<script setup lang="ts">
import type { HistoryEntry, HistoryResponse, SeedsResponse } from '#shared/types/api'

/*
 * "Your rolls" — the PF page starts from the player's own results, not from theory. Every case and upgrade roll
 * knows its seed pair: rolls of a revealed pair verify in one tap (the verifier checks them against the result),
 * rolls of the current seed wait for it to be revealed — the banner says so in plain words and reveals in place.
 * `focus` (a nonce from "Check this roll" on a case or upgrade) highlights that roll and, once its seed is
 * revealed, opens the check by itself: one tap from the case to "matches".
 */
const props = defineProps<{ seeds: SeedsResponse | null; focus?: number; rotating?: boolean }>()
const emit = defineEmits<{
  verify: [{ serverSeed: string; clientSeed: string; nonce: number; expect: { ticket?: number; roll?: number } }]
  rotate: []
}>()

const session = useSessionStore()
const ui = useUiStore()
const entries = ref<HistoryEntry[]>([])
const loaded = ref(false)
async function load() {
  if (!session.user) return ((entries.value = []), (loaded.value = true))
  try {
    entries.value = (await $fetch<HistoryResponse>('/api/history')).entries.filter((e) => e.nonce && e.seedHash).slice(0, 8)
  } catch {
    entries.value = []
  } finally {
    loaded.value = true
  }
}
onMounted(load)
watch(() => session.user?.id, load)
// A rotation or a new roll changes what is sealed: reload with the seeds
watch(() => props.seeds?.active.serverSeedHash, load)

const rows = computed(() =>
  entries.value.map((e) => {
    const pair = props.seeds?.history.find((h) => h.serverSeedHash === e.seedHash) ?? null
    const active = e.seedHash === props.seeds?.active.serverSeedHash
    return { e, pair, focus: active && e.nonce === props.focus }
  }),
)
const sealed = computed(() => rows.value.filter((r) => !r.pair).length)

const spaced = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const value = (e: HistoryEntry) => (e.ticket != null ? spaced(e.ticket) : e.roll != null ? e.roll.toFixed(2) : '—')

function verify(r: (typeof rows.value)[number]) {
  if (!r.pair) return
  emit('verify', { serverSeed: r.pair.serverSeed, clientSeed: r.pair.clientSeed, nonce: r.e.nonce!, expect: r.e.ticket != null ? { ticket: r.e.ticket } : { roll: r.e.roll } })
}

// The roll the player came to check: as soon as its seed is revealed, check it (once)
// (remembered by id while it is still on the current seed: an older pair can have a roll with the same nonce)
let focusId: string | null = null
let autoChecked = false
watch(rows, (list) => {
  focusId ??= list.find((r) => r.focus)?.e.id ?? null
  const r = focusId ? list.find((x) => x.e.id === focusId) : null
  if (!r?.pair || autoChecked) return
  autoChecked = true
  verify(r)
})

// Bring the focused roll into view once it is there
const list = ref<HTMLElement>()
watch(
  () => rows.value.some((r) => r.focus),
  async (has) => {
    if (!has) return
    await nextTick()
    list.value?.querySelector('.is-focus')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  },
)
</script>

<template>
  <section id="rolls" class="flex scroll-mt-24 flex-col gap-3">
    <div class="flex items-end justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h2 class="type-20-caps">{{ $t('fair.myRolls') }}</h2>
        <p class="type-14-regular text-neutral-12">{{ $t('fair.myRollsHint') }}</p>
      </div>
      <NuxtLink v-if="rows.length" to="/profile?tab=history" class="type-12-caps shrink-0 text-neutral-11 hover:text-neutral-15">{{ $t('fair.allHistory') }}</NuxtLink>
    </div>

    <UiEmptyState v-if="!session.user" :text="$t('fair.signInRolls')">
      <UiButton icon="sign-in" @click="ui.openSignIn()">{{ $t('auth.signIn') }}</UiButton>
    </UiEmptyState>
    <UiEmptyState v-else-if="loaded && !rows.length" :text="$t('fair.noRollsYet')">
      <UiButton to="/" icon="cases">{{ $t('account.openCases') }}</UiButton>
    </UiEmptyState>
    <template v-else-if="rows.length">
      <!-- Rolls of the active pair can't be checked yet: say why and offer the rotation right here -->
      <div v-if="sealed" class="flex flex-col gap-3 rounded-2xl bg-success-24 p-4 sm:flex-row sm:items-center">
        <UiIcon name="shield" :size="24" class="shrink-0 text-success max-sm:hidden" />
        <p class="type-14-regular flex-1 text-neutral-14">{{ $t('fair.sealedHint', { n: sealed }, sealed) }}</p>
        <UiButton variant="fair" size="l" icon="refresh" :loading="rotating" class="shrink-0" @click="emit('rotate')">{{ $t('fair.rotateReveal') }}</UiButton>
      </div>
      <ul ref="list" class="flex flex-col gap-1.5">
        <li v-for="r in rows" :key="r.e.id" class="kd-roll" :class="{ 'is-focus': r.focus }">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-3 text-neutral-12 max-sm:hidden">
            <UiIcon :name="r.e.game === 'upgrade' ? 'upgrade' : 'cases'" :size="20" />
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="type-14 truncate">{{ r.e.drop ?? r.e.title }}</span>
            <!-- the case name gives way first: the nonce is what the verifier needs -->
            <span class="type-12-regular flex gap-1 whitespace-nowrap text-neutral-11">
              <span class="truncate">{{ r.e.game === 'upgrade' ? $t('fair.upgrade') : r.e.title }}</span>
              <span class="shrink-0">· {{ $t('fair.nonce') }} {{ r.e.nonce }}</span>
              <span class="shrink-0 max-sm:hidden">· {{ timeAgo(r.e.at) }}</span>
            </span>
          </span>
          <span class="flex shrink-0 flex-col items-end">
            <span class="type-14 font-mono tabular-nums">{{ value(r.e) }}</span>
            <span class="type-10-caps text-neutral-10">{{ r.e.ticket != null ? $t('fair.ticket') : $t('fair.roll') }}</span>
          </span>
          <UiButton v-if="r.pair" variant="fair" size="s" icon="check-circle" class="kd-roll-act" @click="verify(r)">{{ $t('fair.check') }}</UiButton>
          <span v-else class="kd-roll-act type-12-caps flex h-8 items-center justify-center gap-1.5 text-neutral-10">
            <UiIcon name="shield" :size="14" />{{ $t('fair.sealed') }}
          </span>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.kd-roll {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 16px;
  background: var(--color-neutral-2);
  padding: 8px 8px 8px 16px;
  transition: box-shadow var(--dur-slow) var(--ease-out);
}
@media (min-width: 40rem) {
  .kd-roll {
    padding-left: 8px;
  }
}
.kd-roll-act {
  width: 96px;
  flex-shrink: 0;
}
.kd-roll.is-focus {
  box-shadow:
    inset 0 0 0 1px rgb(18 183 106 / 0.6),
    0 0 24px rgb(18 183 106 / 0.18);
}
</style>
