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
/* medium, not the text's regular: thin letters blend into what is behind them, and the same colour looked different
   on each background */
.kd-link {
  color: var(--color-brand-light);
  font-weight: 500;
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
