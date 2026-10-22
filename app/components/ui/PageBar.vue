<script setup lang="ts">
// Imported, not resolveComponent() in the template: the static artifact build left that as a literal <nuxtlink> tag
import { NuxtLink } from '#components'
import type { RouteLocationRaw } from 'vue-router'

// Figma "PageBar": left links · title (or logo) · right links.
// Mobile ("Mobile/CaseTitleBar"): the same links collapse to icons around the title.
export interface PageBarLink {
  label: string
  icon: string
  to?: RouteLocationRaw
  onClick?: () => void
}

/** fixedSides (phones): the link groups take just their icons and the centre takes the rest, so whatever sits at
 *  the centre's ends (e.g. ‹ title ›) stays put from page to page with an even gap to the icons */
defineProps<{ title?: string; logo?: boolean; subtitle?: string; left?: PageBarLink[]; right?: PageBarLink[]; fixedSides?: boolean }>()
</script>

<template>
  <div class="flex min-h-10 items-center gap-2 md:gap-5">
    <div v-for="(side, s) in [left, right]" :key="s" class="contents">
      <div
        class="flex min-w-0 flex-1 items-center gap-1 overflow-hidden md:gap-4"
        :class="[s === 0 ? 'order-1' : 'order-3 justify-end', fixedSides && 'max-md:flex-none']"
      >
        <template v-for="(l, i) in side" :key="l.label">
          <span v-if="i" class="hidden h-5 w-px bg-neutral-5 md:block" />
          <component
            :is="l.to ? NuxtLink : 'button'"
            :to="l.to"
            type="button"
            :aria-label="l.label"
            class="kd-press kd-icon-nudge type-14-caps flex h-10 shrink-0 items-center gap-2 rounded-lg px-2 text-neutral-12 hover:text-neutral-15 md:px-0"
            v-on="l.to ? {} : { click: () => l.onClick?.() }"
          >
            <UiIcon :name="l.icon" :size="20" class="kd-icon" />
            <span class="hidden md:inline">{{ l.label }}</span>
          </component>
        </template>
      </div>
    </div>
    <div class="order-2 flex min-w-0 shrink justify-center" :class="fixedSides && 'max-md:flex-1'">
      <!-- default slot replaces the logo / title (e.g. a custom centre) -->
      <slot>
      <!-- Figma PageBar logo: gradient mark tile + one-line wordmark (242×28) -->
      <!-- the brand stays in frame on game screens (players record short videos of them); it leads home -->
      <span v-if="logo" class="flex flex-col items-center gap-1">
      <NuxtLink to="/" :aria-label="$t('nav.cases')" class="kd-press flex items-center gap-2 md:gap-4">
        <span
          class="relative size-8 shrink-0 overflow-hidden rounded-lg md:size-10"
          style="background-image: linear-gradient(198deg, #000 10%, var(--color-brand-base) 72%, var(--color-coin) 98%)"
        >
          <img src="/img/brand/logo-tile-mark.svg" alt="" class="absolute top-[-16%] left-[-10%] h-[137%] w-[110%] max-w-none" draggable="false" />
        </span>
        <img src="/img/brand/logo-word-wide.svg" alt="KurwaDROP" class="h-4 w-auto sm:h-5 md:h-7" draggable="false" />
      </NuxtLink>
      <span v-if="subtitle" class="type-10-caps text-neutral-11">{{ subtitle }}</span>
      </span>
      <h1 v-else class="type-16-caps md:type-20-caps truncate">{{ title }}</h1>
      </slot>
    </div>
  </div>
</template>
