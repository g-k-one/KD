<script setup lang="ts">
import type { RiskLevel } from '#shared/types/api'
import { PRICE_RANGES, RISK_LEVELS, type CaseSort, type PriceRange } from '~/composables/useCaseFilters'

// Case filters (docs/ux-audit-v2.md). Desktop: a short row of dropdowns — price (one choice), risk (several,
// each with its colour), a "fits my balance" switch, sorting — so nothing is cut off at any width.
// Phones: search, a filters icon with the active count and the sort select; the icon opens a bottom sheet
// with every group in full. Reset shows up only when something is set. Search by name sits in the same row
// on every width (the client's filter reference has no search; CSGOGem, CS2Skin and DogDrop all do).
const price = defineModel<PriceRange>('price', { required: true })
const risks = defineModel<RiskLevel[]>('risks', { required: true })
const affordable = defineModel<boolean>('affordable', { required: true })
const sort = defineModel<CaseSort>('sort', { required: true })
const query = defineModel<string>('query', { required: true })

const { t } = useI18n()
const session = useSessionStore()

const RISK_SWATCH: Record<RiskLevel, string> = {
  low: 'var(--color-success)',
  medium: 'var(--color-coin)',
  high: 'var(--color-brand-light)',
  extreme: 'var(--color-danger)',
}
const priceLabel = (r: PriceRange) => (r === 'any' ? t('filters.anyPrice') : r.replace('-', '–'))
const priceOptions = computed(() => PRICE_RANGES.map((r) => ({ value: r, label: priceLabel(r), coin: r !== 'any' })))
const riskOptions = computed(() => RISK_LEVELS.map((r) => ({ value: r, label: t(`risk.${r}`), swatch: RISK_SWATCH[r] })))
const toggleRisk = (r: RiskLevel) => (risks.value = risks.value.includes(r) ? risks.value.filter((x) => x !== r) : [...risks.value, r])
const sortOptions = computed(() =>
  (['default', 'payback', 'priceAsc', 'priceDesc', 'newest'] as const).map((s) => ({ value: s, label: t(`filters.sortOptions.${s}`) })),
)
const dirty = computed(() => !!query.value.trim() || price.value !== 'any' || risks.value.length > 0 || affordable.value || sort.value !== 'default')
const sheet = ref(false)
// the wallet has its own button on phones, so the count covers what hides in the sheet
const activeCount = computed(() => (price.value !== 'any' ? 1 : 0) + risks.value.length)
function reset() {
  price.value = 'any'
  risks.value = []
  affordable.value = false
  sort.value = 'default'
  query.value = ''
}
</script>

<template>
  <!-- concentric corners: 8px controls + 8px padding = 16px (rounded-3xl) -->
  <div class="kd-filters flex items-center gap-2 rounded-3xl bg-neutral-2 p-2">
    <!-- Search: the row's flexible part on phones, a fixed field after the dropdowns on desktop -->
    <UiInput v-model="query" icon="search" clearable inputmode="search" :placeholder="$t('filters.search')" class="kd-fsearch min-w-0 flex-1 lg:order-2 lg:w-56 lg:flex-none" />
    <!-- Phones: "fits my balance" one tap away (players only), the rest behind the filters icon -->
    <button
      v-if="session.user"
      type="button"
      :aria-label="$t('filters.affordable')"
      :aria-pressed="affordable"
      class="kd-press grid size-10 shrink-0 place-items-center rounded-lg lg:hidden"
      :class="affordable ? 'bg-brand-base/16 text-brand-light ring-1 ring-brand-base ring-inset' : 'bg-neutral-1 text-neutral-12'"
      @click="affordable = !affordable"
    >
      <UiIcon name="wallet" :size="18" />
    </button>
    <!-- Phones: one icon, everything in the sheet -->
    <button type="button" :aria-label="$t('filters.title')" class="kd-press kd-ftrigger relative grid size-10 shrink-0 place-items-center rounded-lg bg-neutral-1 lg:hidden" @click="sheet = true">
      <UiIcon name="sliders" :size="18" class="text-neutral-12" />
      <span v-if="activeCount" class="type-10-caps absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-base px-1 text-neutral-1">{{ activeCount }}</span>
    </button>
    <!-- Desktop: dropdowns, not a ribbon of chips -->
    <div class="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
      <UiSelect v-model="price" :options="priceOptions" menu-width="fixed" class="kd-fsel w-44" :active="price !== 'any'">
        <template #leading><UiCoin :size="14" /></template>
      </UiSelect>
      <UiSelect v-model:values="risks" multiple :options="riskOptions" :placeholder="$t('filters.anyRisk')" menu-width="fixed" class="kd-fsel w-48" :active="risks.length > 0">
        <template #leading>
          <span class="flex items-center gap-0.5">
            <span v-for="r in risks.length ? risks : RISK_LEVELS" :key="r" class="size-1.5 rounded-full" :class="!risks.length && 'opacity-45'" :style="{ background: RISK_SWATCH[r] }" />
          </span>
        </template>
      </UiSelect>
      <UiChip size="m" variant="field" icon="wallet" :active="affordable" :disabled="!session.user" @click="affordable = !affordable">{{ $t('filters.affordableShort') }}</UiChip>
    </div>
    <Transition name="kd-reset">
      <!-- Reset is a chip everywhere (the upgrade's, the PvP dock's): Fits my balance's make, the row's height -->
      <UiChip v-if="dirty" size="m" variant="field" icon="refresh" class="shrink-0 max-lg:hidden lg:order-1" @click="reset">{{ $t('filters.reset') }}</UiChip>
    </Transition>
    <UiSelect v-model="sort" :options="sortOptions" menu-width="fixed" class="kd-sort w-11 shrink-0 lg:order-3 lg:w-48">
      <template #leading><UiIcon name="sort" :size="16" class="text-neutral-11" /></template>
    </UiSelect>

    <UiSheet v-model="sheet" :title="$t('filters.title')">
      <section class="flex flex-col gap-2">
        <span class="type-12-caps text-neutral-11">{{ $t('filters.price') }}</span>
        <div class="flex flex-wrap gap-1.5">
          <UiChip v-for="r in PRICE_RANGES" :key="r" size="m" class="gap-1.5 normal-case" :active="price === r" @click="price = r">
            <UiCoin v-if="r !== 'any'" :size="14" />
            {{ priceLabel(r) }}
          </UiChip>
        </div>
      </section>
      <section class="flex flex-col gap-2">
        <span class="type-12-caps text-neutral-11">{{ $t('filters.volatility') }}</span>
        <div class="grid grid-cols-2 gap-1.5">
          <UiChip v-for="r in RISK_LEVELS" :key="r" size="m" class="gap-1.5 normal-case" :active="risks.includes(r)" @click="toggleRisk(r)">
            <span class="size-2 rounded-full" :style="{ background: RISK_SWATCH[r] }" />
            {{ $t(`risk.${r}`) }}
          </UiChip>
        </div>
      </section>
      <label class="flex h-12 items-center gap-3 rounded-xl bg-neutral-3 px-3" :class="!session.user && 'opacity-40'">
        <UiToggle v-model="affordable" :label="$t('filters.affordable')" :disabled="!session.user" />
        <span class="type-14">{{ $t('filters.affordable') }}</span>
      </label>
      <section class="flex flex-col gap-2">
        <span class="type-12-caps text-neutral-11">{{ $t('filters.sort') }}</span>
        <div class="flex flex-wrap gap-1.5">
          <UiChip v-for="o in sortOptions" :key="o.value" size="m" class="normal-case" :active="sort === o.value" @click="sort = o.value">{{ o.label }}</UiChip>
        </div>
      </section>
      <template #actions>
        <UiButton variant="secondary" size="l" class="flex-1" :disabled="!dirty" @click="reset">{{ $t('filters.reset') }}</UiButton>
        <UiButton size="l" class="flex-1" @click="sheet = false">{{ $t('upgrade.done') }}</UiButton>
      </template>
    </UiSheet>
  </div>
</template>

<style scoped>
/* Right-aligned menu so it never leaves the screen; on phones the select shrinks to its icon (only its own trigger:
   the menu's options are buttons too and must keep their labels) */
:deep(.kd-sort > ul) {
  left: auto;
  right: 0;
}
@media (max-width: 1023.98px) {
  :deep(.kd-sort > button .type-14),
  :deep(.kd-sort > button > :last-child) {
    display: none;
  }
}
.kd-reset-enter-active,
.kd-reset-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-reset-enter-from,
.kd-reset-leave-to {
  opacity: 0;
  transform: translateX(6px);
}
</style>
