<script setup lang="ts">
import type { HistoryEntry } from '#shared/types/api'

// Runs the exact PF maths from shared/utils/pf.ts in the browser — the same code the mock backend uses.
// Opened from "Your rolls" it comes filled in with the roll's seeds and the result to expect; nothing shows below the
// fields until Calculate — then the maths lines up step by step and the verdict lands last. Editing a field clears it.
const open = defineModel<boolean>({ required: true })
// entry: the roll being checked (from "Your rolls"), shown on top so it is clear what the numbers are about
const props = defineProps<{ initial?: { serverSeed?: string; clientSeed?: string; nonce?: number; expect?: { ticket?: number; roll?: number }; entry?: HistoryEntry } }>()
const { t } = useI18n()

const serverSeed = ref('')
const clientSeed = ref('')
const nonce = ref(1)
const result = ref<{ hash: string; number: number; ticket: number; roll: number; seedHash: string } | null>(null)

watch(open, (v) => {
  if (!v) return
  serverSeed.value = props.initial?.serverSeed ?? serverSeed.value
  clientSeed.value = props.initial?.clientSeed ?? clientSeed.value
  nonce.value = props.initial?.nonce ?? nonce.value
  result.value = null
})
// a result belongs to the inputs it was calculated from
watch([serverSeed, clientSeed, nonce], () => (result.value = null))
// bumped on every Calculate, so pressing it again replays the reveal
const run = ref(0)

// Compared against the inputs it was opened with; editing a field drops the check
const expect = computed(() => {
  const i = props.initial
  return i?.expect && serverSeed.value === i.serverSeed && clientSeed.value === i.clientSeed && nonce.value === i.nonce ? i.expect : null
})
const verdict = computed(() => {
  if (!result.value || !expect.value) return null
  const { ticket, roll } = expect.value
  if (ticket != null) return { ok: result.value.ticket === ticket, v: `${t('fair.ticket')} ${spaced(ticket)}` }
  if (roll != null) return { ok: result.value.roll === roll, v: `${t('fair.roll')} ${roll.toFixed(2)}` }
  return null
})

async function calculate() {
  const { hash, number, ticket } = await pfTicket(serverSeed.value, clientSeed.value, nonce.value)
  result.value = { hash, number, ticket, roll: (number % 10_000) / 100, seedHash: await sha256Hex(serverSeed.value) }
  run.value++
}

interface Row {
  k: string
  /** null until Calculate: the row stands with a dash, so the modal keeps its height */
  v: string | null
  mono?: boolean
  accent?: boolean
}
const spaced = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const rows = computed<Row[]>(() => {
  const r = result.value
  return [
    { k: t('fair.hashCheck'), v: r ? r.seedHash : null, mono: true },
    { k: t('fair.hash'), v: r ? r.hash : null, mono: true },
    { k: t('fair.number'), v: r ? spaced(r.number) : null },
    { k: t('fair.ticket'), v: r ? spaced(r.ticket) : null, accent: true },
    { k: t('fair.roll'), v: r ? r.roll.toFixed(2) : null, accent: true },
  ]
})

const toast = useToast()
async function copy(v: string) {
  try {
    await navigator.clipboard.writeText(v)
    toast.show(t('fair.copied'), 'success')
  } catch {
    toast.show(v)
  }
}
</script>

<template>
  <UiModal v-model="open" :title="$t('fair.verifier')" :description="$t('fair.verifierHint')" :width="640">
    <!-- what is being checked, the game on top; under it, on a line of its own, what went in → what came out and the payout (an upgrade's six pieces fit) -->
    <div v-if="initial?.entry" class="flex flex-col gap-3 rounded-2xl bg-neutral-3 p-3">
      <div class="flex items-center gap-3">
        <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-neutral-4 text-neutral-13">
          <!-- the same picture as the row in the history: the case, or the upgrade / PvP art -->
          <img v-if="historyArt(initial.entry)" :src="historyArt(initial.entry)" alt="" class="size-10 object-contain" :class="initial.entry.game === 'upgrade' || isPvpEntry(initial.entry) ? 'p-1' : ''" />
          <UiIcon v-else name="upgrade" :size="20" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-1">
          <span class="type-14 truncate">{{ $t(`account.games.${initial.entry.game}`) }} · <span class="text-neutral-12">{{ initial.entry.title }}</span></span>
          <span class="type-12-regular truncate text-neutral-11">{{ $t('fair.nonce') }} {{ initial.entry.nonce }} · {{ timeAgo(initial.entry.at) }}</span>
        </span>
      </div>
      <div class="flex items-center justify-between gap-3">
        <HistoryItems :entry="initial.entry" class="min-w-0" />
        <UiPrice :amount="initial.entry.payout" :tone="initial.entry.status === 'lost' ? 'muted' : 'success'" class="shrink-0" />
      </div>
    </div>
    <form class="flex flex-col gap-3" @submit.prevent="calculate">
      <label class="flex flex-col gap-2">
        <span class="type-12-caps text-neutral-12">{{ $t('fair.serverSeed') }}</span>
        <UiInput id="v-server" v-model="serverSeed" size="l" mono />
      </label>
      <div class="grid grid-cols-[1fr_120px] gap-3">
        <label class="flex flex-col gap-2">
          <span class="type-12-caps text-neutral-12">{{ $t('fair.clientSeed') }}</span>
          <UiInput id="v-client" v-model="clientSeed" size="l" mono />
        </label>
        <label class="flex flex-col gap-2">
          <span class="type-12-caps text-neutral-12">{{ $t('fair.nonce') }}</span>
          <UiInput id="v-nonce" v-model.number="nonce" size="l" type="number" mono />
        </label>
      </div>
      <UiButton type="submit" variant="fair" size="l" block>{{ $t('fair.calculate') }}</UiButton>
    </form>

    <!-- The maths and the verdict stand from the start (dashes, a hint), so Calculate fills them in place and the modal
         never changes height: the values come in a line at a time, then the verdict lands -->
    <dl class="grid gap-2 rounded-2xl bg-neutral-3 p-4 text-sm">
      <div v-for="(row, i) in rows" :key="row.k" class="grid grid-cols-[140px_1fr_auto] items-center gap-3">
        <dt class="type-12-caps text-neutral-11">{{ row.k }}</dt>
        <dd class="min-w-0 truncate tabular-nums" :class="[row.mono && 'font-mono text-xs text-neutral-13', row.accent && 'type-16-medium font-semibold text-success']">
          <span v-if="row.v != null" :key="`${run}-${i}`" class="kd-rise inline-block max-w-full truncate align-bottom" :style="{ '--d': `${i * 70}ms` }">{{ row.v }}</span>
          <span v-else class="text-neutral-8">—</span>
        </dd>
        <button type="button" class="kd-press text-neutral-11 hover:text-neutral-15 disabled:opacity-0" :disabled="row.v == null" :aria-label="$t('fair.copy')" @click="copy(String(row.v))">
          <UiIcon name="copy" :size="16" />
        </button>
      </div>
    </dl>
    <div v-if="result && verdict" :key="`v${run}`" class="kd-verdict flex h-[76px] items-center gap-3 rounded-2xl p-4" :class="verdict.ok ? 'bg-success-24 text-success' : 'bg-danger-24 text-danger'" :style="{ '--d': `${rows.length * 70 + 120}ms` }">
      <UiIcon :name="verdict.ok ? 'shield-check' : 'x-circle'" :size="24" class="shrink-0" />
      <span class="flex min-w-0 flex-col">
        <span class="type-14-caps">{{ verdict.ok ? $t('fair.match') : $t('fair.mismatch') }}</span>
        <span class="type-12-regular text-neutral-12">{{ $t('fair.yourResult', { v: verdict.v }) }}</span>
      </span>
    </div>
    <!-- before Calculate (or a manual check with nothing to compare): a quiet note in the verdict's place -->
    <div v-else class="flex h-[76px] items-center gap-3 rounded-2xl bg-neutral-3 p-4 text-neutral-11">
      <UiIcon name="shield" :size="24" class="shrink-0" />
      <span class="type-12-regular">{{ result ? $t('fair.compareManual') : expect ? $t('fair.pendingCheck') : $t('fair.pendingManual') }}</span>
    </div>
  </UiModal>
</template>

<style scoped>
.kd-rise {
  animation: kd-rise var(--dur-slow) var(--ease-out) var(--d, 0ms) both;
}
/* the verdict lands with a small pop */
.kd-verdict {
  animation: kd-verdict 520ms var(--ease-spring) var(--d, 0ms) both;
}
@keyframes kd-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
</style>
