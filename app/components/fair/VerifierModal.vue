<script setup lang="ts">
// Runs the exact PF maths from shared/utils/pf.ts in the browser — the same code the mock backend uses.
// Opened from "Your rolls" it comes filled in with the roll's seeds and the result to expect; nothing shows below the
// fields until Calculate — then the maths lines up step by step and the verdict lands last. Editing a field clears it.
const open = defineModel<boolean>({ required: true })
const props = defineProps<{ initial?: { serverSeed?: string; clientSeed?: string; nonce?: number; expect?: { ticket?: number; roll?: number } } }>()
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
  v: string
  mono?: boolean
  accent?: boolean
}
const spaced = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const rows = computed<Row[]>(() =>
  result.value
    ? [
        { k: t('fair.hashCheck'), v: result.value.seedHash, mono: true },
        { k: t('fair.hash'), v: result.value.hash, mono: true },
        { k: t('fair.number'), v: spaced(result.value.number) },
        { k: t('fair.ticket'), v: spaced(result.value.ticket), accent: true },
        { k: t('fair.roll'), v: result.value.roll.toFixed(2), accent: true },
      ]
    : [],
)

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

    <!-- the maths first, a line at a time, then the verdict -->
    <dl v-if="result" :key="`r${run}`" class="grid gap-2 rounded-2xl bg-neutral-3 p-4 text-sm">
      <div v-for="(row, i) in rows" :key="row.k" class="kd-rise grid grid-cols-[140px_1fr_auto] items-center gap-3" :style="{ '--d': `${i * 70}ms` }">
        <dt class="type-12-caps text-neutral-11">{{ row.k }}</dt>
        <dd class="min-w-0 truncate tabular-nums" :class="[row.mono && 'font-mono text-xs text-neutral-13', row.accent && 'type-16-medium font-semibold text-success']">{{ row.v }}</dd>
        <button type="button" class="kd-press text-neutral-11 hover:text-neutral-15" :aria-label="$t('fair.copy')" @click="copy(String(row.v))">
          <UiIcon name="copy" :size="16" />
        </button>
      </div>
    </dl>
    <div v-if="result && verdict" :key="`v${run}`" class="kd-rise kd-verdict flex items-center gap-3 rounded-2xl p-4" :class="verdict.ok ? 'bg-success-24 text-success' : 'bg-danger-24 text-danger'" :style="{ '--d': `${rows.length * 70 + 120}ms` }">
      <UiIcon :name="verdict.ok ? 'shield-check' : 'x-circle'" :size="24" class="shrink-0" />
      <span class="flex min-w-0 flex-col">
        <span class="type-14-caps">{{ verdict.ok ? $t('fair.match') : $t('fair.mismatch') }}</span>
        <span class="type-12-regular text-neutral-12">{{ $t('fair.yourResult', { v: verdict.v }) }}</span>
      </span>
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
@keyframes kd-verdict {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
}
</style>
