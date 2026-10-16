<script setup lang="ts" generic="T extends string">
// Figma "SelectField" (caption + Select) with "Menu" + "DropdownOption".
// multiple=true renders checkbox rows (DropdownOption Type=Check).
export interface SelectOption<V extends string> {
  value: V
  label: string
  /** CSS color for a leading swatch dot */
  swatch?: string
  coin?: boolean
}

const props = withDefaults(
  defineProps<{
    options: SelectOption<T>[]
    label?: string
    placeholder?: string
    multiple?: boolean
    menuWidth?: 'trigger' | 'fixed'
  }>(),
  { menuWidth: 'trigger' },
)

const single = defineModel<T>()
const many = defineModel<T[]>('values', { default: () => [] })

const open = ref(false)
const root = useTemplateRef<HTMLElement>('root')
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
    <span v-if="label" class="type-12-caps text-neutral-12">{{ label }}</span>
    <button
      type="button"
      class="flex h-10 w-full items-center gap-2 rounded-lg border bg-neutral-1 px-3 text-left transition-colors"
      :class="open ? 'border-brand-base' : 'border-neutral-4 hover:border-neutral-7'"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="open = !open"
    >
      <slot name="leading" />
      <span class="type-14 min-w-0 flex-1 truncate text-neutral-15">{{ display }}</span>
      <UiIcon name="chevron-down" :size="20" class="text-neutral-12 transition-transform" :class="open && 'rotate-180'" />
    </button>

    <Transition
      enter-from-class="opacity-0 -translate-y-1"
      enter-active-class="transition duration-150"
      leave-to-class="opacity-0"
      leave-active-class="transition duration-100"
    >
      <ul
        v-if="open"
        role="listbox"
        :aria-multiselectable="multiple"
        class="absolute top-full z-30 mt-2 flex max-h-80 flex-col gap-0.5 overflow-auto rounded-2xl border border-neutral-5 bg-neutral-2 p-1 shadow-elevation-2"
        :class="menuWidth === 'trigger' ? 'inset-x-0' : 'left-0 w-54'"
      >
        <li v-for="o in options" :key="o.value">
          <button
            type="button"
            role="option"
            :aria-selected="isSelected(o)"
            class="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left hover:bg-white-8"
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
