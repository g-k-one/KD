<script setup lang="ts">
import type { Battle } from '#shared/types/api'

/*
 * Check one battle: every ticket is HMAC-SHA256(server seed, EOS block : nonce), the nonce counting up round by round
 * and seat by seat. Once the battle is over the server seed is revealed: we recompute every round here, in the
 * browser, and show that each round's tickets (and so its drops) are the ones the battle had. Before that the hash is
 * all there is, and the modal says when the seed comes.
 */
const open = defineModel<boolean>({ required: true })
const props = defineProps<{ battle: Battle }>()

const rows = ref<Array<{ round: number; name: string; image: string; got: number[]; ok: boolean }>>([])
const hashOk = ref<boolean | null>(null)
const busy = ref(false)
const spaced = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')

async function check() {
  const b = props.battle
  const seed = b.seed.serverSeed
  if (!seed || b.seed.eosBlock == null || !b.results) return
  busy.value = true
  hashOk.value = (await sha256Hex(seed)) === b.seed.serverSeedHash
  const out = []
  let nonce = 0
  for (const [r, round] of b.rounds.entries()) {
    const got: number[] = []
    for (let s = 0; s < b.size; s++) got.push((await pfTicket(seed, String(b.seed.eosBlock), nonce++)).ticket)
    // a round matches when it holds the same tickets (seats keep their own, in seat order)
    const had = b.results[r]!.tickets
    const ok = [...got].sort((x, y) => x - y).join() === [...had].sort((x, y) => x - y).join()
    out.push({ round: r + 1, name: round.name, image: round.image, got, ok })
  }
  rows.value = out
  busy.value = false
}
watch(open, (v) => v && check(), { immediate: true })
const allOk = computed(() => hashOk.value && rows.value.length > 0 && rows.value.every((r) => r.ok))
</script>

<template>
  <UiModal v-model="open" :title="$t('pvp.verifyTitle')" :description="$t('pvp.verifyHint')" :width="640">
    <dl class="grid gap-2 rounded-2xl bg-neutral-3 p-4">
      <div class="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3">
        <dt class="type-12-caps text-neutral-11">{{ $t('fair.serverSeedHash') }}</dt>
        <dd class="min-w-0 truncate font-mono text-xs text-neutral-13">{{ battle.seed.serverSeedHash }}</dd>
      </div>
      <div class="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3">
        <dt class="type-12-caps text-neutral-11">{{ $t('fair.serverSeed') }}</dt>
        <dd class="min-w-0 truncate font-mono text-xs" :class="battle.seed.serverSeed ? 'text-neutral-13' : 'text-neutral-10'">{{ battle.seed.serverSeed ?? $t('pvp.seedAfter') }}</dd>
      </div>
      <div class="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3">
        <dt class="type-12-caps text-neutral-11">{{ $t('pvp.eosBlock') }}</dt>
        <dd class="font-mono text-xs text-neutral-13">{{ battle.seed.eosBlock ?? $t('pvp.eosAfter') }}</dd>
      </div>
    </dl>

    <!-- round by round: the case, the tickets we recompute (one per seat), a check -->
    <ol v-if="rows.length" class="mt-3 flex max-h-[44vh] flex-col gap-1 overflow-y-auto">
      <li v-for="r in rows" :key="r.round" class="grid grid-cols-[28px_36px_minmax(0,1fr)_auto_24px] items-center gap-2.5 rounded-xl px-2 py-1.5">
        <span class="type-12 text-neutral-11 tabular-nums">{{ r.round }}</span>
        <img :src="r.image" alt="" class="size-9 object-contain" />
        <span class="type-14 min-w-0 truncate">{{ r.name }}</span>
        <span class="type-12-regular flex gap-2 font-mono text-neutral-13 tabular-nums">
          <span v-for="(tk, s) in r.got" :key="s">{{ spaced(tk) }}</span>
        </span>
        <UiIcon :name="r.ok ? 'check-circle' : 'x-circle'" :size="18" :class="r.ok ? 'text-success' : 'text-danger'" />
      </li>
    </ol>

    <div v-if="!battle.seed.serverSeed" class="mt-3 flex h-[76px] items-center gap-3 rounded-2xl bg-neutral-3 p-4 text-neutral-11">
      <UiIcon name="shield" :size="24" class="shrink-0" />
      <span class="type-12-regular">{{ $t('pvp.verifyLater') }}</span>
    </div>
    <div v-else-if="rows.length" class="mt-3 flex h-[76px] items-center gap-3 rounded-2xl p-4" :class="allOk ? 'bg-success-24 text-success' : 'bg-danger-24 text-danger'">
      <UiIcon :name="allOk ? 'shield-check' : 'x-circle'" :size="24" class="shrink-0" />
      <span class="flex min-w-0 flex-col">
        <span class="type-14-caps">{{ allOk ? $t('pvp.verifyOk') : $t('pvp.verifyBad') }}</span>
        <span class="type-12-regular text-neutral-12">{{ $t('pvp.verifyRounds', { n: rows.length }) }}</span>
      </span>
    </div>
    <div v-else-if="busy" class="kd-skeleton mt-3 h-[76px] rounded-2xl" />
  </UiModal>
</template>
