<script setup lang="ts">
import type { HistoryEntry, HistoryResponse, SeedsResponse } from '#shared/types/api'

/*
 * "Your rolls" — the PF page starts from the player's own results, not from theory. Every case and upgrade roll
 * knows its seed pair: rolls of a revealed pair verify in one tap (the verifier checks them against the result),
 * rolls of the current seed wait for it to be revealed — the banner says so in plain words and reveals in place.
 * `focus` (a nonce from "Check this roll" on a case or upgrade) highlights that roll and, once its seed is
 * revealed, opens the verifier filled in with it: Calculate there shows "matches".
 */
// focusRoll: a history entry's id (any roll, from the profile's game history), focused and checked the same way
const props = defineProps<{ seeds: SeedsResponse | null; focus?: number; focusRoll?: string; rotating?: boolean }>()
const emit = defineEmits<{
  verify: [{ serverSeed: string; clientSeed: string; nonce: number; expect: { ticket?: number; roll?: number }; entry: HistoryEntry }]
  rotate: []
}>()

const session = useSessionStore()
const ui = useUiStore()
const entries = ref<HistoryEntry[]>([])
const loaded = ref(false)
async function load() {
  if (!session.user) return ((entries.value = []), (loaded.value = true))
  try {
    const all = (await $fetch<HistoryResponse>('/api/history')).entries.filter((e) => e.nonce && e.seedHash)
    // the latest eight, and the roll asked for by id (from the game history) even when it is older
    const asked = props.focusRoll ? all.find((e) => e.id === props.focusRoll) : undefined
    const latest = all.slice(0, 8)
    entries.value = asked && !latest.includes(asked) ? [asked, ...latest] : latest
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
    return { e, pair, focus: (active && e.nonce === props.focus) || e.id === props.focusRoll }
  }),
)
const sealed = computed(() => rows.value.filter((r) => !r.pair).length)
const pairOf = (e: HistoryEntry) => rows.value.find((r) => r.e.id === e.id)?.pair ?? null


function verify(r: (typeof rows.value)[number]) {
  if (!r.pair) return
  emit('verify', { serverSeed: r.pair.serverSeed, clientSeed: r.pair.clientSeed, nonce: r.e.nonce!, expect: r.e.ticket != null ? { ticket: r.e.ticket } : { roll: r.e.roll }, entry: r.e })
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
    <!-- the title and its link, one line: the table and its Check buttons say the rest -->
    <div class="flex items-center justify-between gap-3">
      <h2 class="type-20-caps">{{ $t('fair.myRolls') }}</h2>
      <NuxtLink v-if="rows.length" to="/profile?tab=history" class="type-12-caps flex shrink-0 items-center gap-0.5 text-neutral-11 hover:text-neutral-15">
        {{ $t('fair.allHistory') }}<UiIcon name="chevron-right" :size="14" />
      </NuxtLink>
    </div>

    <UiEmptyState v-if="!session.user" :text="$t('fair.signInRolls')">
      <UiButton icon="sign-in" @click="ui.openSignIn()">{{ $t('auth.signIn') }}</UiButton>
    </UiEmptyState>
    <!-- the rolls on their way: the table's place -->
    <span v-else-if="!loaded" class="kd-skeleton h-[198px] rounded-5xl lg:h-60" aria-hidden="true" />
    <UiEmptyState v-else-if="!rows.length" :text="$t('fair.noRollsYet')">
      <UiButton to="/" icon="cases">{{ $t('account.openCases') }}</UiButton>
    </UiEmptyState>
    <template v-else-if="rows.length">
      <!-- Rolls of the active pair can't be checked yet: say why and offer the rotation right here -->
      <!-- one line, one size: how many are sealed and the way out (the why sits on the lock, on hover) -->
      <div v-if="sealed" class="flex items-center gap-3 rounded-5xl bg-success-24 py-2 pr-2 pl-4">
        <UiIcon name="lock" :size="18" class="shrink-0 text-success" :title="$t('fair.sealedHint')" />
        <span class="type-14 min-w-0 flex-1 text-neutral-15">{{ $t('fair.sealedLine', { n: sealed }, sealed) }}</span>
        <UiButton variant="fair" size="m" icon="refresh" :loading="rotating" class="shrink-0" @click="emit('rotate')">{{ $t('fair.rotateReveal') }}</UiButton>
      </div>
      <!-- the profile's history table, with the roll's number; a revealed roll checks in place -->
      <div ref="list" class="rounded-5xl bg-neutral-2 px-1 py-2 lg:px-3">
        <HistoryTable
          roll
          :entries="rows.map((r) => r.e)"
          :clickable="(e) => !!pairOf(e)"
          :sealed="(e) => !pairOf(e)"
          :focus-id="rows.find((r) => r.focus)?.e.id ?? null"
          @pick="(e) => verify(rows.find((r) => r.e.id === e.id)!)"
        />
      </div>
    </template>
  </section>
</template>
