<script setup lang="ts">
/*
 * The one text field of the kit, styled like UiSelect's trigger so fields and dropdowns line up:
 * bg-neutral-1, 1px neutral-4 rim, brand rim on focus, danger rim on error.
 * Sizes: s 32 · m 40 · l 48 (same as buttons and chips). Leading coin or icon, optional clear (×),
 * trailing slot for units or a button. `lazy` updates the model on change instead of every keystroke.
 */
// v-model.number works: the value comes back as a number (NaN → 0)
const [model, modifiers] = defineModel<string | number | null, 'number'>({
  default: '',
  set: (v) => (modifiers.number ? Number.parseFloat(String(v).replace(',', '.')) || 0 : v),
})
const props = withDefaults(
  defineProps<{
    id?: string
    placeholder?: string
    size?: 's' | 'm' | 'l'
    type?: string
    inputmode?: 'text' | 'decimal' | 'numeric' | 'url' | 'search' | 'email'
    coin?: boolean
    icon?: string
    clearable?: boolean
    error?: boolean | string
    disabled?: boolean
    lazy?: boolean
    align?: 'left' | 'right'
    mono?: boolean
    uppercase?: boolean
  }>(),
  { size: 'm', type: 'text', align: 'left' },
)
const emit = defineEmits<{ clear: []; enter: [] }>()

const cls = computed(
  () =>
    ({
      s: 'h-8 rounded-md px-2 gap-1.5',
      m: 'h-10 rounded-lg px-3 gap-2',
      l: 'h-12 rounded-xl px-4 gap-2',
    })[props.size],
)
const iconSize = computed(() => ({ s: 14, m: 16, l: 18 })[props.size])
const filled = computed(() => model.value !== '' && model.value != null && model.value !== 0)
function onInput(e: Event) {
  if (!props.lazy) model.value = (e.target as HTMLInputElement).value
}
function onChange(e: Event) {
  if (props.lazy) model.value = (e.target as HTMLInputElement).value
}
function clear() {
  model.value = typeof model.value === 'number' ? 0 : ''
  emit('clear')
}
</script>

<template>
  <label class="kd-input flex min-w-0 items-center" :class="[cls, error && 'is-error', disabled && 'is-disabled']">
    <UiCoin v-if="coin" :size="iconSize" class="shrink-0" />
    <UiIcon v-else-if="icon" :name="icon" :size="iconSize" class="shrink-0 text-neutral-11" />
    <slot name="leading" />
    <input
      :id="id"
      :value="model ?? ''"
      :type="type"
      :inputmode="inputmode"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      spellcheck="false"
      class="type-14 w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:normal-case placeholder:text-neutral-9"
      :class="[align === 'right' && 'text-right', mono && 'font-mono text-xs', uppercase && 'uppercase']"
      @input="onInput"
      @change="onChange"
      @keydown.enter="emit('enter')"
    />
    <Transition name="kd-input-clear">
      <button v-if="clearable && filled && !disabled" type="button" class="kd-press kd-hit relative -mr-1 grid size-6 shrink-0 place-items-center rounded-md [--hit:-4px] text-neutral-11 hover:text-neutral-15" :aria-label="$t('upgrade.clear')" @click.prevent="clear">
        <UiIcon name="close" :size="14" />
      </button>
    </Transition>
    <slot name="trailing" />
  </label>
</template>

<style scoped>
.kd-input {
  border: 1px solid var(--color-neutral-4);
  background: var(--color-neutral-1);
  transition: border-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-input:hover {
    border-color: var(--color-neutral-6);
  }
}
.kd-input:focus-within {
  border-color: var(--color-brand-base);
}
.kd-input.is-error {
  border-color: rgb(var(--danger-rgb) / 0.6);
}
.kd-input.is-disabled {
  opacity: 0.5;
}
.kd-input-clear-enter-active,
.kd-input-clear-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    scale var(--dur-base) var(--ease-spring);
}
.kd-input-clear-enter-from,
.kd-input-clear-leave-to {
  opacity: 0;
  scale: 0.6;
}
</style>
