<script setup lang="ts">
// Imported, not resolveComponent() in the template: the static artifact build left that as a literal <nuxtlink> tag
import { NuxtLink } from '#components'
import type { RouteLocationRaw } from 'vue-router'

// Figma "Button": Primary = main CTA, Secondary = neutral, Ghost = nav actions,
// Light = on banners, Success = promo, Gold = rewards, Danger = destructive, Fair = provable-fairness actions.
// States (hover / active / disabled) live in main.css → .kd-btn-*.
type Variant = 'primary' | 'secondary' | 'ghost' | 'light' | 'success' | 'gold' | 'danger' | 'fair' | 'fair-soft'
type Size = 's' | 'm' | 'l'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    icon?: string
    iconRight?: string
    iconOnly?: boolean
    block?: boolean
    to?: RouteLocationRaw
    disabled?: boolean
    loading?: boolean
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

const iconSize = computed(() => ({ s: 16, m: 18, l: 20 })[props.size])
</script>

<template>
  <component
    :is="to ? NuxtLink : 'button'"
    :to="to"
    :type="to ? undefined : type"
    :disabled="to ? undefined : disabled || loading"
    :aria-disabled="disabled || loading || undefined"
    :aria-busy="loading || undefined"
    class="kd-btn kd-press kd-icon-nudge inline-flex shrink-0 items-center justify-center whitespace-nowrap select-none"
    :class="[sizeClass, `kd-btn-${variant}`, block && 'kd-press-wide w-full']"
  >
    <span v-if="loading" class="kd-icon size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    <UiIcon v-else-if="icon" :name="icon" :size="iconSize" class="kd-icon" />
    <slot />
    <UiIcon v-if="iconRight" :name="iconRight" :size="iconSize" class="kd-icon" />
  </component>
</template>
