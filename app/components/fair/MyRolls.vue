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
const isLg = useMediaQuery('(min-width: 1024px)')
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
  <section id="rolls" class="relative z-10 flex scroll-mt-24 flex-col gap-3">
    <!-- relative z-10: the rolls lie over the banner's magnifier when it drifts down past the banner -->
    <!-- one card, as the profile's game history: a header line (the icon and the name, a chip with how many rolls are
         still sealed — the why on hover; on the right the way to open them and the full history), then the table -->
    <div class="flex min-w-0 flex-col rounded-5xl bg-neutral-2 lg:pb-4">
      <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
        <UiIcon name="shield-check" :size="24" class="shrink-0 text-neutral-13" />
        <span class="type-14 lg:type-16-medium">{{ $t('fair.myRolls') }}</span>
        <span v-if="session.user && rows.length && sealed" class="type-12-caps flex h-6 shrink-0 items-center gap-1 rounded-md bg-success-24 px-2 text-success" :title="$t('fair.sealedHint')">
          <UiIcon name="lock" :size="12" />{{ $t('fair.sealedChip', { n: sealed }, sealed) }}
        </span>
        <span class="ml-auto flex shrink-0 items-center gap-2">
          <!-- the history a plain button with its own ground, the main action last, in the corner -->
          <UiButton v-if="rows.length" variant="secondary" :size="isLg ? 'm' : 's'" to="/profile?tab=history" class="max-sm:hidden">{{ $t('fair.allHistory') }}</UiButton>
          <UiButton v-if="session.user && rows.length && sealed" variant="fair" :size="isLg ? 'm' : 's'" icon="refresh" :loading="rotating" @click="emit('rotate')">
            <span class="max-sm:hidden">{{ $t('fair.rotateReveal') }}</span><span class="sm:hidden">{{ $t('fair.reveal') }}</span>
          </UiButton>
        </span>
      </div>

      <UiEmptyState v-if="!session.user" :text="$t('fair.signInRolls')" class="m-3 lg:m-4 lg:mb-0">
        <UiButton icon="sign-in" @click="ui.openSignIn()">{{ $t('auth.signIn') }}</UiButton>
      </UiEmptyState>
      <!-- the rolls on their way: the table's place -->
      <span v-else-if="!loaded" class="kd-skeleton m-3 h-[180px] rounded-3xl lg:m-4 lg:mb-0 lg:h-52" aria-hidden="true" />
      <UiEmptyState v-else-if="!rows.length" :text="$t('fair.noRollsYet')" class="m-3 lg:m-4 lg:mb-0">
        <UiButton to="/" icon="cases">{{ $t('account.openCases') }}</UiButton>
      </UiEmptyState>
      <!-- the profile's history table, with the roll's number; a revealed roll checks in place -->
      <div v-else ref="list" class="px-1 pb-2 lg:px-3">
        <HistoryTable
          roll
          :entries="rows.map((r) => r.e)"
          :clickable="(e) => !!pairOf(e)"
          :sealed="(e) => !pairOf(e)"
          :focus-id="rows.find((r) => r.focus)?.e.id ?? null"
          @pick="(e) => verify(rows.find((r) => r.e.id === e.id)!)"
        />
      </div>
    </div>
  </section>
</template>
