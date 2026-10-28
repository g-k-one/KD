<script setup lang="ts" generic="T extends string">
// Figma "SelectField" (caption + Select) with "Menu" + "DropdownOption".
// multiple=true renders checkbox rows (DropdownOption Type=Check).
export interface SelectOption<V extends string> {
  value: V
  label: string
  /** CSS color for a leading swatch dot */
  swatch?: string
  /** a leading icon, in its own colour when iconColor is set */
  icon?: string
  iconColor?: string
  coin?: boolean
}

const props = withDefaults(
  defineProps<{
    options: SelectOption<T>[]
    label?: string
    placeholder?: string
    multiple?: boolean
    menuWidth?: 'trigger' | 'fixed'
    /** the "filter is set" look, shared with UiChip variant=field */
    active?: boolean
    /** up: always open above the trigger (a select at the very bottom of the page); auto: below unless there is no room */
    placement?: 'auto' | 'up'
  }>(),
  { menuWidth: 'trigger' },
)

const single = defineModel<T>()
const many = defineModel<T[]>('values', { default: () => [] })

const open = ref(false)
const root = useTemplateRef<HTMLElement>('root')
// Opens upward when the screen has no room for the menu below the trigger and more above it (a select at the page's
// very bottom, as the footer's language, was cut off by the screen's edge)
const up = ref(false)
watch(open, (v) => {
  if (!v || !root.value) return
  const r = root.value.getBoundingClientRect()
  const need = Math.min(320, props.options.length * 38 + 8) + 8
  const below = window.innerHeight - r.bottom
  up.value = props.placement === 'up' || (below < need && r.top > below)
})
onClickOutside(root, () => (open.value = false))
onKeyStroke('Escape', () => (open.value = false))

const display = computed(() => {
  if (props.multiple) {
    if (!many.value.length) return props.placeholder ?? ''
    return props.options
      .filter((o) => many.value.includes(o.value))
      .map((o) => o.label)
      .join(', ')
  }
  return props.options.find((o) => o.value === single.value)?.label ?? props.placeholder ?? ''
})

function pick(o: SelectOption<T>) {
  if (props.multiple) {
    many.value = many.value.includes(o.value) ? many.value.filter((v) => v !== o.value) : [...many.value, o.value]
  } else {
    single.value = o.value
    open.value = false
  }
}

const isSelected = (o: SelectOption<T>) => (props.multiple ? many.value.includes(o.value) : single.value === o.value)
</script>

<template>
  <div ref="root" class="relative flex min-w-0 flex-col gap-2">
    <span v-if="label" class="kd-field-label type-12-caps text-neutral-12">{{ label }}</span>
    <button
      type="button"
      class="flex h-10 w-full items-center gap-2 rounded-lg border bg-neutral-1 px-3 text-left transition-colors duration-200"
      :class="[open ? 'border-brand-base' : 'border-neutral-4 hover:border-neutral-6', active && !open && 'kd-field-set']"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="open = !open"
    >
      <slot name="leading" />
      <span class="type-14 min-w-0 flex-1 truncate text-neutral-15">{{ display }}</span>
      <UiIcon name="chevron-down" :size="20" class="text-neutral-12 transition-transform duration-300 ease-[var(--ease-spring)]" :class="open && 'rotate-180'" />
    </button>

    <Transition name="kd-menu">
      <ul
        v-if="open"
        role="listbox"
        :aria-multiselectable="multiple"
        class="kd-menu absolute z-30 flex max-h-80 flex-col gap-0.5 overflow-auto rounded-2xl border border-neutral-5 bg-neutral-2 p-1 shadow-[0_8px_12px_rgb(0_0_0/0.64)]"
        :class="[menuWidth === 'trigger' ? 'inset-x-0' : 'left-0 w-54', up ? 'is-up bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top']"
      >
        <li v-for="(o, i) in options" :key="o.value" :style="{ '--i': i }">
          <button
            type="button"
            role="option"
            :aria-selected="isSelected(o)"
            class="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left transition-colors duration-150 hover:bg-white-8 active:bg-white-12"
            @click="pick(o)"
          >
            <span
              v-if="multiple"
              class="grid size-4 shrink-0 place-items-center rounded-sm border"
              :class="isSelected(o) ? 'border-brand-base bg-brand-base text-neutral-1' : 'border-neutral-8'"
            >
              <UiIcon v-if="isSelected(o)" name="check" :size="12" class="text-neutral-1" />
            </span>
            <span v-if="o.swatch" class="size-2.5 shrink-0 rounded-full" :style="{ background: o.swatch }" />
            <UiIcon v-if="o.icon" :name="o.icon" :size="16" class="shrink-0" :style="o.iconColor ? { color: o.iconColor } : undefined" />
            <UiCoin v-if="o.coin" :size="16" />
            <span class="flex-1 text-sm leading-5" :class="isSelected(o) ? 'font-semibold text-neutral-15' : 'text-neutral-13'">
              {{ o.label }}
            </span>
            <UiIcon v-if="!multiple && isSelected(o)" name="check" :size="16" class="text-brand-base" />
          </button>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
/* Menu unfolds from the trigger, rows follow with a short stagger. */
.kd-menu-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.kd-menu-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-menu-enter-from,
.kd-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
.kd-menu.is-up.kd-menu-enter-from,
.kd-menu.is-up.kd-menu-leave-to {
  transform: translateY(4px) scale(0.97);
}
.kd-menu-enter-active li {
  animation: kd-row-in var(--dur-slow) var(--ease-out) both;
  animation-delay: calc(var(--i) * 18ms);
}
@keyframes kd-row-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
</style>
