<script setup lang="ts">
// Figma "UpgradeSettingsModal": quick presets (multipliers, chances) and spin type.
export interface UpgradePrefs {
  multipliers: number[]
  chances: number[]
  fast: boolean
}

const open = defineModel<boolean>({ required: true })
const prefs = defineModel<UpgradePrefs>('prefs', { required: true })
const draft = ref<UpgradePrefs>(structuredClone(toRaw(prefs.value)))

watch(open, (v) => v && (draft.value = structuredClone(toRaw(prefs.value))))

const DEFAULTS: UpgradePrefs = { multipliers: [2, 4, 8], chances: [35, 55, 75], fast: false }
const TONES = ['danger', 'warning', 'success'] as const

function resetDraft() {
  draft.value = structuredClone(DEFAULTS)
}

function save() {
  prefs.value = {
    multipliers: draft.value.multipliers.map((m) => Math.min(100, Math.max(1.1, Number(m) || 2))),
    chances: draft.value.chances.map((c) => Math.min(95, Math.max(1, Number(c) || 50))),
    fast: draft.value.fast,
  }
  open.value = false
}
</script>

<template>
  <UiModal v-model="open" :title="$t('upgrade.settings')" :width="580">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3">
        <div class="flex items-end justify-between">
          <span class="type-16-medium">{{ $t('upgrade.quickPresets') }}</span>
          <button type="button" class="kd-press type-16-medium text-brand-base hover:text-brand-light hover:underline" @click="resetDraft">
            {{ $t('upgrade.reset') }}
          </button>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <div class="flex flex-col gap-2 rounded-2xl bg-neutral-3 p-3">
            <span class="type-12-caps text-neutral-12">{{ $t('upgrade.multiplierValues') }}</span>
            <div class="grid grid-cols-3 gap-1.5">
              <label v-for="(_, i) in draft.multipliers" :key="i" class="kd-field flex h-12 items-center gap-0.5 rounded-[10px] border border-neutral-4 bg-neutral-1 px-4">
                <span class="type-14-regular w-3 shrink-0 text-neutral-11">×</span>
                <input v-model.number="draft.multipliers[i]" :id="`mult-${i}`" type="number" step="0.1" min="1.1" class="type-14 w-full min-w-0 bg-transparent text-center outline-none" />
              </label>
            </div>
          </div>
          <div class="flex flex-col gap-2 rounded-2xl bg-neutral-3 p-3">
            <span class="type-12-caps text-neutral-12">{{ $t('upgrade.chanceValues') }}</span>
            <div class="grid grid-cols-3 gap-1.5">
              <label
                v-for="(_, i) in draft.chances"
                :key="i"
                class="kd-field flex h-12 items-center gap-0.5 rounded-[10px] border bg-neutral-1 px-4"
                :class="{ 'border-danger-48': TONES[i] === 'danger', 'border-warning-48': TONES[i] === 'warning', 'border-success-48': TONES[i] === 'success' }"
              >
                <input v-model.number="draft.chances[i]" :id="`chance-${i}`" type="number" min="1" max="95" class="type-14 w-full min-w-0 bg-transparent text-center outline-none" />
                <span class="type-14-regular w-3 shrink-0 text-neutral-11">%</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <span class="type-16-medium">{{ $t('upgrade.spinType') }}</span>
        <div class="grid grid-cols-2 gap-2" role="radiogroup">
          <button
            v-for="opt in [{ fast: false, key: 'normal', img: 'spin-normal' }, { fast: true, key: 'fast', img: 'spin-fast' }]"
            :key="opt.key"
            type="button"
            role="radio"
            :aria-checked="draft.fast === opt.fast"
            class="kd-option kd-press group flex items-center gap-3 rounded-2xl border p-3 text-left sm:gap-4 sm:p-4"
            @click="draft.fast = opt.fast"
          >
            <img :src="`/img/illustrations/${opt.img}.png`" alt="" class="kd-spin-art size-14 shrink-0 object-contain sm:size-16" />
            <span class="flex flex-col gap-1">
              <span class="type-14" :class="draft.fast === opt.fast ? 'text-brand-light' : 'text-neutral-15'">{{ $t(`upgrade.${opt.key}`) }}</span>
              <span class="type-12-regular" :class="draft.fast === opt.fast ? 'text-neutral-14' : 'text-neutral-12'">{{ $t(`upgrade.${opt.key}Hint`) }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
    <template #actions>
      <UiButton size="l" icon="check-circle" class="mx-auto w-60" @click="save">{{ $t('upgrade.saveClose') }}</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
/* Figma "OptionCard": Default neutral-3 / neutral-4, Hover lifts the border, Selected brand-24 fill + brand border */
.kd-option {
  background: var(--color-neutral-3);
  border-color: var(--color-neutral-4);
  transition:
    background-color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-option:hover {
    border-color: var(--color-neutral-7);
  }
}
.kd-option[aria-checked='true'] {
  background: var(--color-brand-24);
  border-color: var(--color-brand-base);
}
.kd-field {
  transition: border-color var(--dur-base) var(--ease-out);
}
.kd-field:focus-within {
  border-color: var(--color-brand-base);
}
.kd-field input::-webkit-inner-spin-button {
  display: none;
}
@media (hover: hover) {
  .group:hover .kd-spin-art {
    animation: kd-wiggle 500ms var(--ease-out);
  }
}
@keyframes kd-wiggle {
  30% {
    transform: rotate(-8deg) scale(1.06);
  }
  60% {
    transform: rotate(5deg) scale(1.06);
  }
}
</style>
