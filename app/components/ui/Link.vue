<script setup lang="ts">
// Imported, not resolveComponent(): the static artifact build left that as a literal <nuxtlink> tag
import { NuxtLink } from '#components'

// The one link inside running text: brand colour, underlined on hover. An address with a protocol opens in a new tab.
const props = defineProps<{ to: string }>()
const external = computed(() => /^https?:/.test(props.to))
</script>

<template>
  <component :is="external ? 'a' : NuxtLink" v-bind="external ? { href: to, target: '_blank', rel: 'noopener' } : { to }" class="kd-link"><slot /></component>
</template>

<style scoped>
.kd-link {
  color: var(--color-brand-light);
  text-decoration: underline transparent;
  text-underline-offset: 2px;
  transition: text-decoration-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-link:hover {
    text-decoration-color: currentColor;
  }
}
</style>
