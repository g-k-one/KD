<script setup lang="ts">
import type { HistoryEntry, HistoryResponse, RevealedSeedPair } from '#shared/types/api'

/*
 * Check on a past pair in the seed log: every roll of the pair recomputed here in the browser, from the same maths as
 * the verifier, against the result the game gave. It starts on its own: the count and the bar climb as the rolls tick
 * through the list, the verdict lands last. The pace is only so it can be seen: each tick is a real recomputation.
 * A roll in the list opens the verifier with its numbers line by line. Debug forces step the nonce past rolls that never
 * happened, so numbers without a roll are said out loud, not counted as a failure.
 */
const open = defineModel<boolean>({ required: true })
const props = defineProps<{ pair: RevealedSeedPair | null; period?: string }>()
const emit = defineEmits<{
  verify: [{ serverSeed: string; clientSeed: string; nonce: number; expect: { ticket?: number; roll?: number }; entry: HistoryEntry }]
}>()
const { t } = useI18n()
const toast = useToast()
const sfx = useSfx()

const PACE_MS = 1200
const ROW_H = 40

const entries = ref<HistoryEntry[]>([])
const loaded = ref(false)
const results = ref<Record<string, boolean>>({})
const done = ref(0)
const total = computed(() => entries.value.length)
const finished = computed(() => loaded.value && done.value === total.value)
const bad = computed(() => Object.values(results.value).filter((ok) => !ok).length)
const missing = computed(() => Math.max(0, (props.pair?.nonce ?? 0) - total.value))
// once it is over, a roll that failed comes first (nothing moves while it runs, or when all is well)
const rows = computed(() => (finished.value && bad.value ? [...entries.value].sort((a, b) => Number(results.value[a.id]) - Number(results.value[b.id])) : entries.value))

const list = useTemplateRef<HTMLElement>('list')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const same = async ({ serverSeed, clientSeed }: RevealedSeedPair, e: HistoryEntry) =>
  e.ticket != null ? (await pfTicket(serverSeed, clientSeed, e.nonce!)).ticket === e.ticket : (await pfRoll(serverSeed, clientSeed, e.nonce!)).roll === e.roll

// a run belongs to one opening: closing (or opening another pair) drops it
let run = 0
async function start(pair: RevealedSeedPair) {
  const mine = ++run
  entries.value = []
  results.value = {}
  done.value = 0
  loaded.value = false
  try {
    const { entries: rolls } = await $fetch<HistoryResponse>(`/api/seeds/${pair.serverSeedHash}/rolls`)
    if (mine !== run) return
    entries.value = rolls
  } catch (e) {
    toast.error(e, t('common.error'))
    open.value = false
    return
  }
  loaded.value = true
  await nextTick()
  const steps = Math.max(1, Math.min(40, total.value))
  const each = Math.ceil(total.value / steps)
  const pause = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.min(120, PACE_MS / steps)
  for (const [i, e] of entries.value.entries()) {
    results.value[e.id] = await same(pair, e)
    if (mine !== run) return
    done.value = i + 1
    if (done.value % each) continue
    if (list.value) list.value.scrollTop = Math.max(0, done.value - 5) * ROW_H
    if (pause) await wait(pause)
    if (mine !== run) return
  }
  if (list.value && bad.value) list.value.scrollTop = 0
  if (total.value) (bad.value ? sfx.denied : sfx.ok)()
}

watch(open, (v) => {
  if (v && props.pair) start(props.pair)
  else run++
})

function pick(e: HistoryEntry) {
  const p = props.pair
  if (p) emit('verify', { serverSeed: p.serverSeed, clientSeed: p.clientSeed, nonce: e.nonce!, expect: e.ticket != null ? { ticket: e.ticket } : { roll: e.roll }, entry: e })
}
const spaced = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const value = (e: HistoryEntry) => (e.ticket != null ? spaced(e.ticket) : (e.roll ?? 0).toFixed(2))
</script>

<template>
  <UiModal v-model="open" :title="$t('fair.pairCheck')" :width="640">
    <div class="flex flex-col gap-3 rounded-2xl bg-neutral-3 p-4">
      <div class="flex items-baseline justify-between gap-3">
        <span class="type-20-caps tabular-nums">{{ done }} <span class="text-neutral-11">/ {{ loaded ? total : pair?.nonce }}</span></span>
        <span class="type-12-regular text-neutral-11">{{ period }}</span>
      </div>
      <span class="kd-pairbar" :class="bad && 'is-bad'"><span :style="{ transform: `scaleX(${total ? done / total : 0})` }" /></span>
    </div>

    <span v-if="!loaded" class="kd-skeleton h-[264px] rounded-2xl" aria-hidden="true" />
    <ul v-else-if="total" ref="list" class="flex max-h-[264px] flex-col overflow-y-auto overscroll-contain rounded-2xl bg-neutral-3 p-1.5">
      <li v-for="e in rows" :key="e.id" class="shrink-0">
        <!-- the number, the game, what it rolled, its tick: the row is the way to its numbers -->
        <button type="button" class="kd-pairrow kd-press" :disabled="results[e.id] === undefined" @click="pick(e)">
          <span class="type-12 tabular-nums text-neutral-11">#{{ e.nonce }}</span>
          <span class="type-14 truncate">{{ e.game === 'case' ? e.title : $t('account.games.upgrade') }}</span>
          <span class="kd-pairmono">{{ value(e) }}</span>
          <UiIcon v-if="results[e.id] === true" name="check" :size="16" class="kd-pairtick text-success" />
          <UiIcon v-else-if="results[e.id] === false" name="x-circle" :size="16" class="kd-pairtick text-danger" />
          <span v-else class="size-1.5 justify-self-center rounded-full bg-neutral-6" />
        </button>
      </li>
    </ul>

    <!-- the verdict's place stands from the start with a quiet note, so the modal keeps its height -->
    <div v-if="finished && total" class="kd-verdict flex h-[76px] items-center gap-3 rounded-2xl p-4" :class="bad ? 'bg-danger-24 text-danger' : 'bg-success-24 text-success'">
      <UiIcon :name="bad ? 'x-circle' : 'shield-check'" :size="24" class="shrink-0" />
      <span class="flex min-w-0 flex-col">
        <span class="type-14-caps">{{ bad ? $t('fair.pairMismatch', { bad, n: total }) : $t('fair.pairAllMatch', { n: total }, total) }}</span>
        <span class="type-12-regular text-neutral-12">{{ bad ? $t('fair.pairMismatchHint') : missing ? $t('fair.pairGap', { n: missing }, missing) : $t('fair.pairSameResults') }}</span>
      </span>
    </div>
    <div v-else class="flex h-[76px] items-center gap-3 rounded-2xl bg-neutral-3 p-4 text-neutral-11">
      <UiIcon name="shield" :size="24" class="shrink-0" />
      <span class="type-12-regular">{{ finished ? $t('fair.pairEmpty') : $t('fair.pairChecking') }}</span>
    </div>
  </UiModal>
</template>

<style scoped>
.kd-pairbar {
  display: block;
  height: 6px;
  overflow: hidden;
  border-radius: 9999px;
  background: var(--color-neutral-5);
}
.kd-pairbar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-success);
  transform-origin: left;
  transition: transform 120ms linear;
}
.kd-pairbar.is-bad > span {
  background: var(--color-danger);
}
.kd-pairrow {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 40px;
  border-radius: 10px;
  padding: 0 8px;
  text-align: left;
  transition: background-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-pairrow:not(:disabled):hover {
    background: var(--color-neutral-4);
  }
}
.kd-pairmono {
  font: 500 13px/20px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  color: var(--color-neutral-13);
  font-variant-numeric: tabular-nums;
}
.kd-pairtick {
  animation: kd-pairtick 220ms var(--ease-spring) both;
}
/* the verdict lands with a small pop, as the verifier's does */
.kd-verdict {
  animation: kd-verdict 520ms var(--ease-spring) both;
}
@keyframes kd-pairtick {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
}
@keyframes kd-verdict {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
}
</style>
