<script setup lang="ts">
import type { HistoryEntry, HistoryResponse, SeedsResponse } from '#shared/types/api'

/*
 * "Your rolls" — the PF page starts from the player's own results, not from theory. Every case and upgrade roll
 * knows its seed pair: rolls of a revealed pair verify in one tap (the verifier checks them against the result),
 * rolls of the current seed wait for it to be revealed — the banner says so in plain words and reveals in place.
 * `focus` (a nonce from "Check this roll" on a case or upgrade) highlights that roll and, once its seed is
 * revealed, opens the check by itself: one tap from the case to "matches".
 */
// focusRoll: a history entry's id (any roll, from the profile's game history), focused and checked the same way
const props = defineProps<{ seeds: SeedsResponse | null; focus?: number; focusRoll?: string; rotating?: boolean }>()
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
      <!-- the same rows as the profile's game history: what it was, what went in and out, the roll's number, and a
           quiet check at the end; the whole row checks it -->
      <ul ref="list" class="flex flex-col gap-1 rounded-5xl bg-neutral-2 p-3 lg:p-4">
        <li v-for="r in rows" :key="r.e.id">
          <component
            :is="r.pair ? 'button' : 'div'"
            :type="r.pair ? 'button' : undefined"
            class="kd-roll grid w-full grid-cols-[40px_minmax(0,1fr)_28px] items-center gap-2.5 rounded-2xl px-1.5 py-2 text-left lg:grid-cols-[44px_minmax(0,1fr)_auto_120px_32px] lg:gap-4 lg:px-2"
            :class="{ 'is-focus': r.focus, 'kd-press is-roll': r.pair }"
            :aria-label="r.pair ? `${$t('fair.check')}: ${r.e.drop ?? r.e.title}` : undefined"
            @click="verify(r)"
          >
            <span class="grid size-10 place-items-center rounded-xl bg-neutral-3 text-neutral-13 lg:size-11">
              <img v-if="r.e.caseImage" :src="r.e.caseImage" alt="" class="size-9 object-contain" loading="lazy" />
              <UiIcon v-else :name="r.e.game === 'upgrade' ? 'upgrade' : 'cases'" :size="18" />
            </span>
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="type-14 truncate"><span class="max-lg:hidden">{{ $t(`account.games.${r.e.game}`) }} · </span><span class="lg:text-neutral-12">{{ r.e.title }}</span></span>
              <!-- the nonce stays: it is what the verifier needs -->
              <span class="type-12-regular truncate text-neutral-11">
                <span class="lg:hidden">{{ $t(`account.games.${r.e.game}`) }} · </span>{{ $t('fair.nonce') }} {{ r.e.nonce }} · {{ timeAgo(r.e.at) }}<span class="lg:hidden"> · {{ value(r.e) }}</span>
              </span>
            </span>
            <HistoryItems :entry="r.e" class="max-lg:hidden" />
            <!-- the roll's number in one line, where the profile shows the amount -->
            <span class="type-14 flex items-baseline justify-end gap-1.5 whitespace-nowrap max-lg:hidden">
              <span class="type-12-regular text-neutral-11">{{ r.e.ticket != null ? $t('fair.ticket') : $t('fair.roll') }}</span>
              <span class="font-mono tabular-nums">{{ value(r.e) }}</span>
            </span>
            <span class="kd-roll-check grid size-7 place-items-center justify-self-end rounded-lg lg:size-8" :class="!r.pair && 'is-sealed'" :title="r.pair ? $t('fair.check') : $t('fair.sealed')">
              <UiIcon :name="r.pair ? 'shield-check' : 'shield'" :size="18" />
            </span>
          </component>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
/* as the profile's history rows: a revealed roll is a button, lit on hover, its check turning green */
.kd-roll.is-roll {
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-roll-check {
  color: var(--color-success);
  background: rgb(18 183 106 / 0.12);
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-roll-check.is-sealed {
  color: var(--color-neutral-10);
  background: none;
}
@media (hover: hover) {
  .kd-roll.is-roll:hover {
    background: var(--color-neutral-3);
  }
  .kd-roll.is-roll:hover .kd-roll-check {
    background: rgb(18 183 106 / 0.24);
  }
}
.kd-roll.is-focus {
  box-shadow:
    inset 0 0 0 1px rgb(18 183 106 / 0.6),
    0 0 24px rgb(18 183 106 / 0.18);
}
</style>
