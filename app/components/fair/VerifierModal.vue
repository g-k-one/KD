<script setup lang="ts">
// Runs the exact PF maths from shared/utils/pf.ts in the browser — the same code the mock backend uses.
const open = defineModel<boolean>({ required: true })
const props = defineProps<{ initial?: { serverSeed?: string; clientSeed?: string; nonce?: number } }>()
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

async function calculate() {
  const { hash, number, ticket } = await pfTicket(serverSeed.value, clientSeed.value, nonce.value)
  result.value = { hash, number, ticket, roll: (number % 10_000) / 100, seedHash: await sha256Hex(serverSeed.value) }
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

    <Transition name="kd-result">
      <dl v-if="result" class="grid gap-2 rounded-2xl bg-neutral-3 p-4 text-sm">
        <div v-for="row in rows" :key="row.k" class="grid grid-cols-[140px_1fr_auto] items-center gap-3">
          <dt class="type-12-caps text-neutral-11">{{ row.k }}</dt>
          <dd class="min-w-0 truncate tabular-nums" :class="[row.mono && 'font-mono text-xs text-neutral-13', row.accent && 'type-16-medium font-semibold text-success']">{{ row.v }}</dd>
          <button type="button" class="kd-press text-neutral-11 hover:text-neutral-15" :aria-label="$t('fair.copy')" @click="copy(String(row.v))">
            <UiIcon name="copy" :size="16" />
          </button>
        </div>
      </dl>
    </Transition>
  </UiModal>
</template>

<style scoped>
.kd-result-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-result-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
</style>
