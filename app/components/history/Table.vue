<script setup lang="ts">
import type { HistoryEntry } from '#shared/types/api'
import { NuxtLink } from '#components'

/*
 * The game history as a table (the bet history on Stake): one line per game, real columns under headers — when,
 * the game (the case, the upgrade, a payment…), the drop, the stake, the payout, the profit (+ green, − grey),
 * and the check. Used by the profile's game history, the Provably Fair page's rolls and the upgrade page's own list,
 * so it reads the same everywhere. `roll` adds the roll's number (ticket or upgrade roll) before the time.
 * Phones: no headers; each line is the drop, its name over "game · time", the payout over the profit, the check.
 */
const props = defineProps<{
  entries: HistoryEntry[]
  /** where a row leads (a roll: its check on the Provably Fair page) */
  link?: (e: HistoryEntry) => string | undefined
  /** a row is a button instead (the rolls page checks in place) */
  clickable?: (e: HistoryEntry) => boolean
  /** its seed is still secret: the check is greyed */
  sealed?: (e: HistoryEntry) => boolean
  focusId?: string | null
  roll?: boolean
}>()
const emit = defineEmits<{ pick: [e: HistoryEntry] }>()
const { t } = useI18n()

const isPvp = isPvpEntry
const played = (e: HistoryEntry) => e.game === 'case' || e.game === 'upgrade'
const GAME_ICON = { deposit: 'plus', sell: 'wallet', withdraw: 'steam' } as const
// a skin that was sold or withdrawn is named in the drop column; only a payment needs its title here
const gameName = (e: HistoryEntry) => (e.game === 'case' ? e.title : e.game === 'upgrade' || e.result ? t(`account.games.${e.game}`) : `${t(`account.games.${e.game}`)} · ${e.title}`)
const gameArt = historyArt
const parts = (name: string) => {
  const [weapon, ...rest] = name.split(' | ')
  return { weapon: weapon!, skin: rest.join(' | ') }
}
const profit = (e: HistoryEntry) => e.payout - e.bet
const spaced = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const rollValue = (e: HistoryEntry) => (e.ticket != null ? spaced(e.ticket) : e.roll != null ? e.roll.toFixed(2) : '')

/** A roll (its seeds) or a battle (its own seed and EOS block) can be checked; a payment has nothing to check */
const checkable = (e: HistoryEntry) => e.nonce != null || !!e.battleId
const kind = (e: HistoryEntry) => (props.link?.(e) ? 'link' : props.clickable?.(e) ? 'button' : 'row')
const cols = computed(() =>
  props.roll
    ? 'lg:grid-cols-[48px_minmax(0,1.1fr)_minmax(0,1.5fr)_96px_96px_96px_112px_92px]'
    : 'lg:grid-cols-[48px_minmax(0,1.1fr)_minmax(0,1.6fr)_104px_104px_104px_92px]',
)
</script>

<template>
  <div class="flex min-w-0 flex-col">
    <!-- headers (desktop) -->
    <div class="kd-th type-10-caps sticky top-0 z-[1] hidden h-9 items-center gap-4 border-b border-neutral-4 px-3 text-neutral-11 lg:grid" :class="cols">
      <span>{{ $t('history.time') }}</span>
      <span>{{ $t('history.game') }}</span>
      <span>{{ $t('history.drop') }}</span>
      <span class="text-right">{{ $t('history.stake') }}</span>
      <span class="text-right">{{ $t('history.payout') }}</span>
      <span class="text-right">{{ $t('history.profit') }}</span>
      <span v-if="roll" class="text-right">{{ $t('history.roll') }}</span>
      <span />
    </div>
    <ul class="flex flex-col">
      <li v-for="e in entries" :key="e.id" class="kd-tr border-b border-neutral-3 last:border-0" :class="focusId === e.id && 'is-focus'">
        <component
          :is="kind(e) === 'link' ? NuxtLink : kind(e) === 'button' ? 'button' : 'div'"
          :to="kind(e) === 'link' ? link!(e) : undefined"
          :type="kind(e) === 'button' ? 'button' : undefined"
          class="grid w-full grid-cols-[44px_minmax(0,1fr)_auto_32px] items-center gap-3 px-2 py-2.5 text-left lg:gap-4 lg:px-3 lg:py-0 lg:h-[62px]"
          :class="[cols, kind(e) !== 'row' && 'kd-tr-hit']"
          @click="kind(e) === 'button' && emit('pick', e)"
        >
          <span class="type-14-regular text-neutral-11 tabular-nums max-lg:hidden">{{ timeAgo(e.at) }}</span>
          <!-- game (desktop column; on phones its picture sits on the drop) -->
          <span class="flex min-w-0 items-center gap-2.5 max-lg:hidden">
            <!-- an upgrade's arrow or a battle's sword is drawn edge to edge: a 4 px inset so it sits as small as a case -->
            <img v-if="gameArt(e)" :src="gameArt(e)" alt="" class="size-9 shrink-0 object-contain" :class="e.game === 'upgrade' || isPvp(e) ? 'p-1' : ''" loading="lazy" />
            <span v-else class="grid size-9 shrink-0 place-items-center rounded-xl bg-neutral-3 text-neutral-12"><UiIcon :name="GAME_ICON[e.game as keyof typeof GAME_ICON] ?? 'cases'" :size="18" /></span>
            <span class="type-14 truncate">{{ gameName(e) }}</span>
          </span>
          <!-- the drop: its picture on its rarity, weapon over skin; a missed upgrade target dimmed -->
          <span class="contents lg:flex lg:min-w-0 lg:items-center lg:gap-2.5">
            <span v-if="e.result" class="kd-thumb relative grid h-10 w-11 shrink-0 place-items-center rounded-[10px] lg:w-13" :class="e.game === 'upgrade' && e.status === 'lost' && 'is-lost'" :style="{ '--rc': RARITY_COLOR[e.result.rarity] }">
              <ItemArt :image="e.result.image" :rarity="e.result.rarity" :size="26" class="w-full" />
              <img v-if="gameArt(e)" :src="gameArt(e)" alt="" class="absolute -right-1.5 -bottom-1.5 size-5 object-contain lg:hidden" />
            </span>
            <span v-else class="grid h-10 w-11 shrink-0 place-items-center rounded-[10px] bg-neutral-3 text-neutral-12 lg:hidden"><UiIcon :name="GAME_ICON[e.game as keyof typeof GAME_ICON] ?? 'cases'" :size="18" /></span>
            <span class="flex min-w-0 flex-col">
              <template v-if="e.result">
                <span class="kd-weapon type-10-caps truncate max-lg:hidden">{{ parts(e.result.name).weapon }}</span>
                <span class="type-14 truncate" :style="{ color: RARITY_COLOR[e.result.rarity] }"><span class="lg:hidden">{{ parts(e.result.name).weapon }} | </span>{{ parts(e.result.name).skin }}</span>
              </template>
              <!-- nothing dropped (a payment, rakeback): its name on phones, a dash in the desktop column (the game says it) -->
              <span v-else class="type-14 truncate"><span class="lg:hidden">{{ e.title }}</span><span class="text-neutral-10 max-lg:hidden">—</span></span>
              <!-- phones: the game and when, under the name -->
              <span class="type-12-regular truncate text-neutral-11 lg:hidden">{{ e.result ? gameName(e) : $t(`account.games.${e.game}`) }} · {{ timeAgo(e.at) }}<template v-if="roll && rollValue(e)"> · {{ rollValue(e) }}</template></span>
            </span>
          </span>
          <!-- money: stake · payout · profit (desktop), payout over profit (phones) -->
          <span class="type-14 text-right tabular-nums max-lg:hidden">
            <UiPrice v-if="e.bet" :amount="e.bet" />
            <span v-else class="text-neutral-10">{{ played(e) ? $t('history.free') : '—' }}</span>
          </span>
          <span class="type-14 text-right tabular-nums max-lg:hidden">
            <UiPrice v-if="e.payout" :amount="e.payout" />
            <span v-else class="text-neutral-10">—</span>
          </span>
          <span class="type-14 flex flex-col items-end tabular-nums lg:block lg:text-right">
            <UiPrice v-if="e.payout" :amount="e.payout" size="s" class="lg:hidden" />
            <span v-else class="text-neutral-10 lg:hidden">—</span>
            <span v-if="played(e)" class="max-lg:type-12" :class="profit(e) >= 0 ? 'text-success' : 'text-neutral-12'">{{ profit(e) >= 0 ? '+' : '−' }}{{ formatCoins(Math.abs(profit(e))) }}</span>
            <span v-else class="text-neutral-10 max-lg:hidden">—</span>
          </span>
          <span v-if="roll" class="flex flex-col items-end max-lg:hidden">
            <span class="type-14 font-mono tabular-nums">{{ rollValue(e) }}</span>
            <span class="type-10-caps text-neutral-11">{{ e.ticket != null ? $t('fair.ticket') : e.chance != null ? $t('history.ofChance', { pct: (e.chance / 100).toFixed(2) }) : '' }}</span>
          </span>
          <!-- the check: a clear green chip on every roll and battle (the icon alone on phones) -->
          <span v-if="checkable(e)" class="kd-check type-12-caps flex h-8 items-center justify-center gap-1.5 justify-self-end rounded-lg max-lg:w-8 lg:px-2.5" :class="sealed?.(e) && 'is-sealed'" :title="sealed?.(e) ? $t('fair.sealedHintShort') : $t('fair.check')">
            <UiIcon :name="sealed?.(e) ? 'shield' : 'shield-check'" :size="16" class="shrink-0" />
            <span class="max-lg:hidden">{{ $t('fair.check') }}</span>
          </span>
          <span v-else />
        </component>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.kd-th {
  background: var(--color-neutral-2);
}
.kd-weapon {
  color: var(--color-weapon);
}
.kd-thumb {
  background: color-mix(in srgb, var(--rc) 18%, var(--color-neutral-3));
}
.kd-thumb.is-lost {
  opacity: 0.45;
  filter: grayscale(0.7);
}
.kd-tr-hit {
  border-radius: 12px;
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-check {
  color: var(--color-success);
  background: rgb(18 183 106 / 0.12);
  transition: background-color var(--dur-base) var(--ease-out);
}
/* its seed is still secret: the chip waits, grey */
.kd-check.is-sealed {
  color: var(--color-neutral-11);
  background: var(--color-neutral-3);
}
@media (hover: hover) {
  .kd-tr-hit:hover {
    background: var(--color-neutral-3);
  }
  .kd-tr-hit:hover .kd-check:not(.is-sealed) {
    background: rgb(18 183 106 / 0.24);
  }
}
.kd-tr.is-focus {
  border-radius: 12px;
  box-shadow:
    inset 0 0 0 1px rgb(18 183 106 / 0.6),
    0 0 24px rgb(18 183 106 / 0.18);
}
</style>
