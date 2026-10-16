<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// Figma "Button": Primary = main CTA, Secondary = neutral, Ghost = nav actions,
// Light = on banners, Success = promo, Gold = rewards.
type Variant = 'primary' | 'secondary' | 'ghost' | 'light' | 'success' | 'gold'
type Size = 's' | 'm' | 'l'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    icon?: string
    iconOnly?: boolean
    block?: boolean
    to?: RouteLocationRaw
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', size: 'm', type: 'button' },
)

const sizeClass = computed(() => {
  if (props.iconOnly) {
    return { s: 'size-8 rounded-md', m: 'size-10 rounded-lg', l: 'size-12 rounded-xl' }[props.size]
  }
  return {
    s: 'h-8 px-2 gap-2 rounded-md type-12-caps',
    m: 'h-10 px-4 gap-2 rounded-lg type-12-caps',
    l: 'h-12 px-6 gap-2 rounded-xl type-14-caps',
  }[props.size]
})

const variantClass = computed(
  () =>
    ({
      primary: 'bg-brand-gradient text-neutral-1 shadow-inner-primary hover:brightness-110',
      secondary: 'bg-neutral-6 text-neutral-15 hover:bg-neutral-7',
      ghost: 'text-neutral-12 hover:text-neutral-15 hover:bg-white-8',
      light: 'bg-neutral-15 text-neutral-1 hover:bg-neutral-14',
      success: 'bg-success text-neutral-1 shadow-inner-primary hover:brightness-110',
      gold: 'bg-coin text-neutral-1 shadow-inner-primary hover:brightness-110',
    })[props.variant],
)

const iconSize = computed(() => ({ s: 16, m: 18, l: 20 })[props.size])
</script>

<template>
  <component
    :is="to ? resolveComponent('NuxtLink') : 'button'"
    :to="to"
    :type="to ? undefined : type"
    :disabled="disabled"
    class="inline-flex shrink-0 items-center justify-center whitespace-nowrap transition active:opacity-80 disabled:pointer-events-none disabled:opacity-40"
    :class="[sizeClass, variantClass, block && 'w-full']"
  >
    <UiIcon v-if="icon" :name="icon" :size="iconSize" />
    <slot />
  </component>
</template>
