<script setup lang="ts">
import type { Battle, CaseItem } from '#shared/types/api'
import { battleTie, battleTotals, battleWinners } from '#shared/utils/battle'

/*
 * Check one battle, all of it, in the browser:
 *   the seed — SHA-256(server seed) must be the hash shown before anyone joined
 *   every case — each player's ticket is HMAC-SHA256(server seed, EOS block ID : nonce), the nonce counting up round by
 *     round and seat by seat; the ticket falls in one skin's range of that case (the odds fixed when the battle was
 *     made), and that skin must be the one the player got
 *   the winner — each seat's total from those skins, the mode's rule, a tie settled by the seeds (battleWinners)
 * The block is named when the last seat fills and its ID (the salt) is taken once the block is out, so nobody, us
 * included, knows it when the server seed is committed; the block opens on a public explorer.
 */
const open = defineModel<boolean>({ required: true })
const props = defineProps<{ battle: Battle }>()
const { t } = useI18n()

type Seat = { seat: number; nonce: number; ticket: number; skin: CaseItem; ok: boolean }
const rounds = ref<Array<{ round: number; name: string; image: string; seats: Seat[]; ok: boolean }>>([])
const hash = ref<string | null>(null)
const totals = ref<number[]>([])
const winners = ref<number[]>([])
const tied = ref(false)
const busy = ref(false)
const spaced = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const who = (seat: number) => props.battle.slots[seat]?.player?.nickname ?? t('pvp.seatN', { n: seat + 1 })

async function check() {
  const b = props.battle
  const seed = b.seed.serverSeed
  const salt = b.seed.eosBlockId
  if (!seed || !salt || !b.results) return
  busy.value = true
  hash.value = await sha256Hex(seed)
  const out = []
  let nonce = 0
  for (const [r, round] of b.rounds.entries()) {
    const seats: Seat[] = []
    for (let s = 0; s < b.size; s++) {
      const n = nonce++
      const { ticket } = await pfTicket(seed, salt, n)
      const skin = pickByTicket(b.odds[round.slug] ?? [], ticket)
      // in seat order: this seat's ticket and the skin it gives must be the ones this seat had
      const had = b.results[r]!
      seats.push({ seat: s, nonce: n, ticket, skin, ok: had.tickets[s] === ticket && had.drops[s]?.id === skin.id })
    }
    out.push({ round: r + 1, name: round.name, image: round.image, seats, ok: seats.every((x) => x.ok) })
  }
  rounds.value = out
  totals.value = battleTotals(b.size, out.map((r) => r.seats.map((x) => x.skin)))
  const best = b.mode === 'crazy' ? Math.min(...totals.value) : Math.max(...totals.value)
  tied.value = b.mode === 'team' ? totals.value[0]! + totals.value[1]! === totals.value[2]! + totals.value[3]! : totals.value.filter((x) => x === best).length > 1
  winners.value = battleWinners(b.mode, totals.value, await battleTie(seed, salt))
  busy.value = false
}
watch(open, (v) => v && check(), { immediate: true })

const hashOk = computed(() => hash.value != null && hash.value === props.battle.seed.serverSeedHash)
const winnersOk = computed(() => winners.value.length > 0 && winners.value.join() === props.battle.winners.join())
const roundsOk = computed(() => rounds.value.length > 0 && rounds.value.every((r) => r.ok))
const allOk = computed(() => hashOk.value && roundsOk.value && winnersOk.value)
// the named block on a public EOS explorer, where its ID can be read
const explorer = computed(() => (props.battle.seed.eosBlock == null ? null : `https://bloks.io/block/${props.battle.seed.eosBlock}`))
</script>

<template>
  <UiModal v-model="open" :title="$t('pvp.verifyTitle')" :description="$t('pvp.verifyHint')" :width="720">
    <!-- the seeds, and the first check: the revealed seed hashes to what was shown before anyone joined -->
    <dl class="grid gap-2 rounded-2xl bg-neutral-3 p-4">
      <div class="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-3">
        <dt class="type-12-caps text-neutral-11">{{ $t('fair.serverSeedHash') }}</dt>
        <dd class="min-w-0 truncate font-mono text-xs text-neutral-13">{{ battle.seed.serverSeedHash }}</dd>
      </div>
      <div class="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-3">
        <dt class="type-12-caps text-neutral-11">{{ $t('fair.serverSeed') }}</dt>
        <dd class="min-w-0 truncate font-mono text-xs" :class="battle.seed.serverSeed ? 'text-neutral-13' : 'text-neutral-10'">{{ battle.seed.serverSeed ?? $t('pvp.seedAfter') }}</dd>
      </div>
      <div v-if="hash" class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
        <dt class="type-12-caps text-neutral-11 max-sm:col-span-2">{{ $t('pvp.hashOfSeed') }}</dt>
        <dd class="min-w-0 truncate font-mono text-xs text-neutral-13">{{ hash }}</dd>
        <span class="type-12 flex items-center gap-1" :class="hashOk ? 'text-success' : 'text-danger'">
          <UiIcon :name="hashOk ? 'check-circle' : 'x-circle'" :size="16" />{{ hashOk ? $t('pvp.hashMatches') : $t('pvp.hashDiffers') }}
        </span>
      </div>
      <div class="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-3">
        <dt class="type-12-caps text-neutral-11">{{ $t('pvp.eosBlock') }}</dt>
        <dd v-if="explorer" class="min-w-0">
          <UiLink :to="explorer" class="inline-flex items-center gap-1 font-mono text-xs">
            #{{ spaced(battle.seed.eosBlock!) }}<UiIcon name="arrow-square-out" :size="12" />
          </UiLink>
        </dd>
        <dd v-else class="font-mono text-xs text-neutral-10">{{ $t('pvp.eosAfter') }}</dd>
      </div>
      <!-- the salt: the named block's ID, unknown to anyone until the block is out -->
      <div class="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-3">
        <dt class="type-12-caps text-neutral-11">{{ $t('pvp.eosBlockId') }}</dt>
        <dd class="min-w-0 truncate font-mono text-xs" :class="battle.seed.eosBlockId ? 'text-neutral-13' : 'text-neutral-10'" :title="battle.seed.eosBlockId ?? undefined">
          {{ battle.seed.eosBlockId ?? (battle.seed.eosBlock == null ? $t('pvp.eosIdAfterFill') : $t('pvp.eosIdAfterBlock')) }}
        </dd>
      </div>
    </dl>

    <div v-if="rounds.length" class="mt-3 flex max-h-[48vh] flex-col gap-2 overflow-y-auto">
      <!-- every case: each player's nonce and ticket, the skin whose range holds it, and whether it is what they got -->
      <section v-for="r in rounds" :key="r.round" class="flex flex-col gap-1 rounded-2xl bg-neutral-3 p-2">
        <header class="flex items-center gap-2.5 px-1">
          <span class="type-12 w-5 text-neutral-11 tabular-nums">{{ r.round }}</span>
          <img :src="r.image" alt="" class="size-8 object-contain" />
          <span class="type-14 min-w-0 flex-1 truncate">{{ r.name }}</span>
          <UiIcon :name="r.ok ? 'check-circle' : 'x-circle'" :size="18" :class="r.ok ? 'text-success' : 'text-danger'" />
        </header>
        <div v-for="x in r.seats" :key="x.seat" class="grid grid-cols-[minmax(0,110px)_auto_minmax(0,1fr)_auto_18px] items-center gap-3 rounded-lg bg-neutral-2 px-2 py-1.5 max-sm:grid-cols-[auto_minmax(0,1fr)_18px]">
          <span class="type-12 min-w-0 truncate text-neutral-13 max-sm:col-span-3">{{ who(x.seat) }}</span>
          <span class="type-12-regular flex flex-col font-mono leading-tight tabular-nums">
            <span class="text-neutral-15">{{ spaced(x.ticket) }}</span>
            <span class="text-neutral-10">{{ $t('pvp.nonceN', { n: x.nonce }) }}</span>
          </span>
          <span class="flex min-w-0 items-center gap-2">
            <img :src="x.skin.image" alt="" class="size-8 shrink-0 object-contain" />
            <span class="flex min-w-0 flex-col leading-tight">
              <span class="type-12 truncate" :style="{ color: RARITY_COLOR[x.skin.rarity] }">{{ x.skin.weapon }} | {{ x.skin.skin }}</span>
              <span class="type-10-caps font-mono text-neutral-10 tabular-nums">{{ spaced(x.skin.ticketFrom) }}–{{ spaced(x.skin.ticketTo) }}</span>
            </span>
          </span>
          <UiPrice :amount="x.skin.price" size="s" class="max-sm:hidden" />
          <UiIcon :name="x.ok ? 'check-circle' : 'x-circle'" :size="16" :class="x.ok ? 'text-success' : 'text-danger'" />
        </div>
      </section>

      <!-- the totals from those skins and the mode's rule: who wins -->
      <section class="flex flex-col gap-1 rounded-2xl bg-neutral-3 p-2">
        <header class="flex items-center gap-2.5 px-1 pb-1">
          <span class="type-12-caps flex-1 text-neutral-11">{{ $t('pvp.totalsTitle') }} · {{ $t(`pvp.modeRule.${battle.mode}`) }}</span>
          <UiIcon :name="winnersOk ? 'check-circle' : 'x-circle'" :size="18" :class="winnersOk ? 'text-success' : 'text-danger'" />
        </header>
        <div v-for="(sum, s) in totals" :key="s" class="flex items-center gap-2 rounded-lg px-2 py-1.5" :class="winners.includes(s) ? 'bg-success-24' : 'bg-neutral-2'">
          <span class="type-12 min-w-0 flex-1 truncate" :class="winners.includes(s) ? 'text-success' : 'text-neutral-13'">
            <span v-if="battle.mode === 'team'" class="text-neutral-11">{{ s < 2 ? 'A' : 'B' }} · </span>{{ who(s) }}
          </span>
          <span v-if="winners.includes(s)" class="type-10-caps text-success">{{ $t('pvp.winsTag') }}</span>
          <UiPrice :amount="sum" size="s" />
        </div>
        <p v-if="tied" class="type-12-regular px-1 pt-1 text-neutral-11">{{ $t('pvp.tieBySeeds') }}</p>
      </section>
    </div>

    <div v-if="!battle.seed.serverSeed" class="mt-3 flex h-[76px] items-center gap-3 rounded-2xl bg-neutral-3 p-4 text-neutral-11">
      <UiIcon name="shield" :size="24" class="shrink-0" />
      <span class="type-12-regular">{{ $t('pvp.verifyLater') }}</span>
    </div>
    <div v-else-if="rounds.length" class="mt-3 flex h-[76px] items-center gap-3 rounded-2xl p-4" :class="allOk ? 'bg-success-24 text-success' : 'bg-danger-24 text-danger'">
      <UiIcon :name="allOk ? 'shield-check' : 'x-circle'" :size="24" class="shrink-0" />
      <span class="flex min-w-0 flex-col">
        <span class="type-14-caps">{{ allOk ? $t('pvp.verifyOk') : $t('pvp.verifyBad') }}</span>
        <span class="type-12-regular text-neutral-12">{{ $t('pvp.verifyAll', { n: rounds.length, p: battle.size }) }}</span>
      </span>
    </div>
    <div v-else-if="busy" class="kd-skeleton mt-3 h-[76px] rounded-2xl" />
  </UiModal>
</template>
