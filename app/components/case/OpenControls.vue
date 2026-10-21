<script setup lang="ts">
// Figma "OpenControls" (desktop) and "Mobile/OpenControls".
// State=Result shows "Sell all" next to "Open again"; the Open button keeps its place.
const count = defineModel<1 | 2 | 3 | 4 | 5>('count', { required: true })
const fast = defineModel<boolean>('fast', { required: true })
const kurwadrop = defineModel<boolean>('kurwadrop', { required: true })

defineProps<{
  price: number
  phase: 'idle' | 'spinning' | 'result'
  unsoldTotal: number
}>()
const emit = defineEmits<{ open: []; sellAll: [] }>()

const COUNTS = [1, 2, 3, 4, 5] as const
</script>

<template>
  <div class="flex flex-col gap-3 lg:grid lg:min-h-14 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
    <div class="flex items-center justify-between gap-2 lg:justify-start">
      <div class="flex flex-1 gap-1 lg:flex-none" role="radiogroup">
        <UiChip
          v-for="n in COUNTS"
          :key="n"
          role="radio"
          :aria-checked="count === n"
          :active="count === n"
          :disabled="phase === 'spinning'"
          class="flex-1 lg:flex-none"
          @click="count = n"
        >
          x{{ n }}
        </UiChip>
      </div>
    </div>

    <div class="flex gap-2 lg:justify-center">
      <UiButton size="l" class="flex-1 lg:w-60 lg:flex-none" :loading="phase === 'spinning'" @click="emit('open')">
        <template v-if="phase === 'spinning'">{{ $t('case.opening') }}</template>
        <template v-else-if="phase === 'result'">{{ $t('case.openAgain') }}</template>
        <template v-else>{{ $t('case.open', { count }) }}</template>
        <UiPrice v-if="phase !== 'spinning'" :amount="price * count" size="m" tone="inverse" />
        <span v-if="phase === 'idle'" class="kd-shine" />
      </UiButton>
      <Transition name="kd-sellall">
        <UiButton v-if="phase === 'result' && unsoldTotal > 0" variant="light" size="l" class="flex-1 lg:w-60 lg:flex-none" @click="emit('sellAll')">
          {{ $t('wallet.sellAll') }}
          <UiPrice :amount="unsoldTotal" size="m" tone="inverse" />
        </UiButton>
      </Transition>
    </div>

    <div class="flex items-center justify-center gap-4 lg:justify-end">
      <label class="type-14 flex cursor-pointer items-center gap-2.5">
        <UiToggle v-model="fast" :label="$t('case.fastOpen')" />
        {{ $t('case.fastOpen') }}
      </label>
      <span class="h-5 w-px bg-neutral-5" />
      <UiTooltip :text="$t('case.kurwaHint')">
        <label class="flex cursor-pointer items-center gap-2.5">
          <UiToggle v-model="kurwadrop" :label="$t('case.kurwadrop')" />
          <span class="type-14 bg-brand-gradient bg-clip-text text-transparent">{{ $t('case.kurwadrop') }}</span>
        </label>
      </UiTooltip>
    </div>
  </div>
</template>

<style scoped>
.kd-sellall-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-sellall-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-sellall-enter-from,
.kd-sellall-leave-to {
  opacity: 0;
  transform: translateX(-12px) scale(0.96);
}
</style>
