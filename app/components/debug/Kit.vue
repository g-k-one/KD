<script setup lang="ts">
import type { RiskLevel } from '#shared/types/api'

// Debug → UI kit: every ui/* component in its states, with a playground for the ones that take many props.
const toast = useToast()

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'light', 'success', 'gold', 'danger', 'fair'] as const
const SIZES = ['s', 'm', 'l'] as const
const CHIP_TONES = ['none', 'success', 'warning', 'danger', 'coin', 'gold'] as const
const PRICE_SIZES = ['xs', 's', 'm', 'l', 'xl', 'xxl'] as const
const PRICE_TONES = ['default', 'coin', 'success', 'muted'] as const
const RISKS: RiskLevel[] = ['low', 'medium', 'high', 'extreme']
const ICONS = Object.keys(import.meta.glob('~/assets/icons/*.svg')).map((p) => p.split('/').pop()!.replace('.svg', ''))

// Button playground
const btn = reactive({ variant: 'primary' as (typeof BUTTON_VARIANTS)[number], size: 'm' as (typeof SIZES)[number], icon: true, iconOnly: false, loading: false, disabled: false, label: 'Open case' })
// Chip playground
const chipOn = ref<Record<string, boolean>>({})
// Inputs
const text = ref('')
const coins = ref('125.40')
const search = ref('')
const errored = ref('KURWA?')
const inputSize = ref<'s' | 'm' | 'l'>('m')
// Selects
const sort = ref<'price' | 'new' | 'pop'>('price')
const rar = ref<string[]>([])
const SORT_OPTS = [
  { value: 'price' as const, label: 'Price' },
  { value: 'new' as const, label: 'Newest' },
  { value: 'pop' as const, label: 'Popular' },
]
const RAR_OPTS = RARITIES.map((r) => ({ value: r, label: r, swatch: RARITY_COLOR[r] }))
// Segmented / tabs
const seg = ref<'grid' | 'list'>('grid')
const seg3 = ref<'2' | '3' | '4'>('2')
const tab = ref<'a' | 'b' | 'c'>('a')
// Misc
const toggle = ref(true)
const check = ref(false)
const slider = ref(40)
const desc = ref(true)
const modal = ref(false)
const sheet = ref(false)
const collapsed = ref(false)
const swapWords = ['Open case', 'Rolling…', 'Upgrade the win', 'KURWADROP!', 'Not this time']
const swapI = ref(0)
const amount = ref(312540)
const iconSize = ref(20)
const iconQuery = ref('')
const shownIcons = computed(() => ICONS.filter((n) => n.includes(iconQuery.value.toLowerCase())))
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Buttons -->
    <section class="dbg-card">
      <h2 class="dbg-h">Button</h2>
      <div class="dbg-play">
        <div class="flex min-h-20 flex-1 items-center justify-center rounded-2xl bg-neutral-1 p-4">
          <UiButton :variant="btn.variant" :size="btn.size" :icon="btn.icon ? 'upgrade' : undefined" :icon-only="btn.iconOnly" :loading="btn.loading" :disabled="btn.disabled" aria-label="demo">
            {{ btn.iconOnly ? '' : btn.label }}
          </UiButton>
        </div>
        <div class="dbg-knobs">
          <UiSelect v-model="btn.variant" :options="BUTTON_VARIANTS.map((v) => ({ value: v, label: v }))" label="Variant" />
          <UiSegmented v-model="btn.size" :options="SIZES.map((s) => ({ value: s, label: s.toUpperCase() }))" size="s" />
          <UiInput v-model="btn.label" size="s" placeholder="Label" />
          <div class="flex flex-wrap gap-3">
            <UiToggle v-model="btn.icon" label="Icon" />
            <UiToggle v-model="btn.iconOnly" label="Icon only" />
            <UiToggle v-model="btn.loading" label="Loading" />
            <UiToggle v-model="btn.disabled" label="Disabled" />
          </div>
        </div>
      </div>
      <div v-for="size in SIZES" :key="size" class="flex flex-wrap items-center gap-2">
        <UiButton v-for="v in BUTTON_VARIANTS" :key="v" :variant="v" :size="size" icon="plus">{{ v }}</UiButton>
        <UiButton :size="size" icon="plus" icon-only aria-label="icon only" />
        <UiButton :size="size" loading>loading</UiButton>
        <UiButton :size="size" disabled>disabled</UiButton>
      </div>
    </section>

    <!-- Chips -->
    <section class="dbg-card">
      <h2 class="dbg-h">Chip <span class="dbg-note">tap to toggle active</span></h2>
      <div v-for="size in SIZES" :key="size" class="flex flex-wrap items-center gap-2">
        <UiChip v-for="t in CHIP_TONES" :key="t" :size="size" :tone="t" icon="fire" :active="chipOn[`${size}${t}`]" @click="chipOn[`${size}${t}`] = !chipOn[`${size}${t}`]">{{ t }}</UiChip>
        <UiChip :size="size" disabled>disabled</UiChip>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="dbg-note">variant=field</span>
        <UiChip size="l" variant="field" icon="sliders" :active="chipOn.f1" @click="chipOn.f1 = !chipOn.f1">Filters</UiChip>
        <UiChip size="l" variant="field" tone="coin" icon="fast" :active="chipOn.f2" @click="chipOn.f2 = !chipOn.f2">Fast</UiChip>
        <UiChip size="l" variant="field" tone="gold" icon="chicken" :active="chipOn.f3" @click="chipOn.f3 = !chipOn.f3">KURWADROP</UiChip>
      </div>
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Inputs -->
      <section class="dbg-card">
        <h2 class="dbg-h">Input</h2>
        <UiSegmented v-model="inputSize" :options="SIZES.map((s) => ({ value: s, label: s.toUpperCase() }))" size="s" class="w-fit" />
        <UiInput v-model="text" :size="inputSize" placeholder="Plain" />
        <UiInput v-model="coins" :size="inputSize" coin clearable lazy align="right" inputmode="decimal" placeholder="0" />
        <UiInput v-model="search" :size="inputSize" icon="search" clearable placeholder="Search skins" />
        <UiInput v-model="errored" :size="inputSize" uppercase mono error="Unknown promo code" placeholder="Promo" />
        <UiInput model-value="disabled" :size="inputSize" disabled />
      </section>

      <!-- Selects / segmented / tabs -->
      <section class="dbg-card">
        <h2 class="dbg-h">Select · Segmented · Tabs</h2>
        <div class="flex flex-wrap gap-2">
          <UiSelect v-model="sort" :options="SORT_OPTS" label="Sort" class="w-44" />
          <UiSelect v-model:values="rar" :options="RAR_OPTS" multiple placeholder="Rarity" :active="!!rar.length" class="w-44" />
        </div>
        <div class="flex flex-wrap gap-2">
          <UiSegmented v-model="seg" :options="[{ value: 'grid', icon: 'view-grid', title: 'Grid' }, { value: 'list', icon: 'view-list', title: 'List' }]" />
          <UiSegmented v-model="seg3" :options="[{ value: '2', label: '1v1' }, { value: '3', label: '1v1v1' }, { value: '4', label: '2v2' }]" />
          <UiSegmented v-model="seg3" size="s" disabled :options="[{ value: '2', label: 'off' }, { value: '3', label: 'disabled' }]" />
        </div>
        <UiTabs v-model="tab" :tabs="[{ value: 'a', label: 'My skins', count: 12 }, { value: 'b', label: 'Desired skin' }, { value: 'c', label: 'History', count: 3 }]" />
      </section>

      <!-- Toggles -->
      <section class="dbg-card">
        <h2 class="dbg-h">Toggle · Checkbox · Slider · SortArrows</h2>
        <div class="flex flex-wrap items-center gap-4">
          <UiToggle v-model="toggle" label="Sound" />
          <UiToggle :model-value="false" label="Disabled" disabled />
          <label class="type-14 flex items-center gap-2"><UiCheckbox v-model="check" /> I'm 18+</label>
          <button type="button" class="kd-press flex items-center gap-1 type-12-caps" @click="desc = !desc">Price <UiSortArrows :desc="desc" /></button>
        </div>
        <UiSlider v-model="slider" label="Volume" class="max-w-80" />
        <UiSlider v-model="slider" :min="0" :max="100" :show-value="false" class="max-w-80" />
      </section>

      <!-- Overlays -->
      <section class="dbg-card">
        <h2 class="dbg-h">Modal · Sheet · Tooltip · Toast</h2>
        <div class="flex flex-wrap gap-2">
          <UiButton size="s" variant="secondary" @click="modal = true">Modal</UiButton>
          <UiButton size="s" variant="secondary" @click="sheet = true">Sheet</UiButton>
          <UiTooltip text="Tooltip text: short and helpful"><UiButton size="s" variant="ghost" icon="info">Hover me</UiButton></UiTooltip>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiButton size="s" variant="ghost" @click="toast.show('Plain toast')">Toast</UiButton>
          <UiButton size="s" variant="success" @click="toast.show('Sold for 12.40', 'success')">Success</UiButton>
          <UiButton size="s" variant="danger" @click="toast.show('Not enough coins', 'danger')">Danger</UiButton>
          <UiButton size="s" variant="ghost" @click="toast.error({ data: { message: 'API error message' } }, 'fallback')">API error</UiButton>
        </div>
        <UiModal v-model="modal" title="Modal title" description="One line that says what this is about.">
          <p class="type-14-regular text-neutral-12">Body content. Esc or the scrim closes it.</p>
          <template #actions>
            <UiButton variant="secondary" @click="modal = false">Cancel</UiButton>
            <UiButton @click="modal = false">Confirm</UiButton>
          </template>
        </UiModal>
        <UiSheet v-model="sheet" title="Sheet title">
          <p class="type-14-regular text-neutral-12">Phones: a bottom sheet. Drag down or tap the scrim.</p>
          <template #actions>
            <UiButton class="w-full" @click="sheet = false">Done</UiButton>
          </template>
        </UiSheet>
      </section>

      <!-- Accordion / section header -->
      <section class="dbg-card">
        <h2 class="dbg-h">Accordion · SectionHeader · PageBar</h2>
        <UiSectionHeader title="Section" collapsible :collapsed="collapsed" @toggle="collapsed = !collapsed">
          <template #actions><UiChip size="s">Action</UiChip></template>
        </UiSectionHeader>
        <UiAccordion title="How does KURWADROP work?" default-open>Presentation only: no extra chance, no surcharge.</UiAccordion>
        <UiAccordion title="Closed by default">Hidden content.</UiAccordion>
        <UiPageBar title="Page title" subtitle="Subtitle" :left="[{ to: '/history', label: 'History', icon: 'history' }]" :right="[{ to: '/fairness', label: 'Fairness', icon: 'shield-check' }]" />
      </section>

      <!-- TextSwap -->
      <section class="dbg-card">
        <h2 class="dbg-h">TextSwap <span class="dbg-note">one word at a time, out-in</span></h2>
        <div class="flex items-center gap-3">
          <UiButton size="m" class="min-w-56"><UiTextSwap :text="swapWords[swapI]!" /></UiButton>
          <UiButton size="s" variant="secondary" icon="refresh" @click="swapI = (swapI + 1) % swapWords.length">Next</UiButton>
        </div>
      </section>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Price -->
      <section class="dbg-card">
        <h2 class="dbg-h">Price · Coin · CoinStack</h2>
        <UiSlider v-model="amount" :min="0" :max="10000000" label="Amount (cents)" />
        <div v-for="tone in PRICE_TONES" :key="tone" class="flex flex-wrap items-center gap-4">
          <UiPrice v-for="s in PRICE_SIZES" :key="s" :amount="amount" :size="s" :tone="tone" />
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <UiPrice :amount="amount" compact />
          <div class="bg-brand-gradient flex gap-4 rounded-lg p-2"><UiPrice :amount="amount" size="l" tone="inverse" /></div>
          <UiCoin :size="16" /><UiCoin :size="24" /><UiCoin :size="32" inverse />
          <UiCoinStack :size="34" :amount="5000" />
          <UiCoinStack :size="40" :amount="50000" />
          <UiCoinStack :size="48" :amount="500000" />
        </div>
      </section>

      <!-- Risk / avatars / badges -->
      <section class="dbg-card">
        <h2 class="dbg-h">Risk · Avatar · LevelBadge · Logo</h2>
        <div v-for="r in RISKS" :key="r" class="grid grid-cols-3 items-center gap-4">
          <UiRiskMeter :level="r" />
          <UiRiskMeter :level="r" show-label />
          <UiRiskPeppers :level="r" />
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <UiAvatar src="/img/brand/avatar.webp" :size="24" />
          <UiAvatar src="/img/brand/avatar.webp" :level="12" />
          <UiAvatar src="/img/brand/avatar.webp" :size="48" :level="57" />
          <UiAvatar :size="40" />
          <UiLevelBadge v-for="l in [1, 9, 27, 99]" :key="l" :level="l" />
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <UiLogo :height="32" />
          <UiLogo variant="mark" :height="32" />
          <UiLogo muted :height="24" />
        </div>
      </section>
    </div>

    <!-- Icons -->
    <section class="dbg-card">
      <h2 class="dbg-h">Icons <span class="dbg-note">{{ ICONS.length }} · Phosphor Bold</span></h2>
      <div class="flex flex-wrap items-center gap-3">
        <UiInput v-model="iconQuery" size="s" icon="search" clearable placeholder="Filter" class="w-48" />
        <UiSlider v-model="iconSize" :min="12" :max="40" label="Size" class="w-60" />
      </div>
      <div class="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-12">
        <div v-for="n in shownIcons" :key="n" class="flex flex-col items-center gap-1 rounded-xl bg-neutral-1 p-2" :title="n">
          <UiIcon :name="n" :size="iconSize" />
          <span class="type-10-caps w-full truncate text-center normal-case text-neutral-11">{{ n }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
