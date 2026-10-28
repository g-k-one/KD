<script setup lang="ts">
// Imported, not resolveComponent() in the template: the static artifact build left that as a literal <nuxtlink> tag
import { NuxtLink } from '#components'
import type { RouteLocationRaw } from 'vue-router'

// Figma "PageBar": left links · title (or logo) · right links. The right side is the same on every page — Fairness
// (none on the PF page) — so pages set only the left links; a page can set its own right side (the profile: Log out).
// Sound is not here: it is a setting (Settings), not something every page needs at hand.
// Mobile ("Mobile/CaseTitleBar"): the same links collapse to icons around the title.
export interface PageBarLink {
  label: string
  icon: string
  to?: RouteLocationRaw
  onClick?: () => void
}

/** fixedSides (phones): the link groups take just their icons and the centre takes the rest, so whatever sits at
 *  the centre's ends (e.g. ‹ title ›) stays put from page to page with an even gap to the icons. Both sides are as wide
 *  as the side with more icons, so the centre is the screen's middle even with two icons on one side and one on the other */
const props = defineProps<{ title?: string; logo?: boolean; subtitle?: string; left?: PageBarLink[]; right?: PageBarLink[]; fixedSides?: boolean }>()
const { t } = useI18n()
const route = useRoute()
const right = computed<PageBarLink[]>(() => props.right ?? (route.path === '/fairness' ? [] : [{ label: t('case.fairness'), icon: 'shield', to: '/fairness' }]))
// the wider side's icon count: a 36 px icon each and the 4 px gaps between them
const sideIcons = computed(() => Math.max(props.left?.length ?? 0, right.value.length))
</script>

<template>
  <div class="flex min-h-10 items-center gap-2 md:gap-5">
    <div v-for="(side, s) in [left, right]" :key="s" class="contents">
      <div
        class="flex min-w-0 flex-1 items-center gap-1 overflow-hidden md:gap-4"
        :class="[s === 0 ? 'order-1' : 'order-3 justify-end', fixedSides && 'kd-bar-side max-md:flex-none']"
        :style="fixedSides ? { '--n': sideIcons } : undefined"
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
        <!-- phones: the two-line wordmark, as in the header, so the bar's side links keep their room -->
        <img src="/img/brand/logo-word.svg" alt="KurwaDROP" class="h-7 w-auto sm:hidden" draggable="false" />
        <img src="/img/brand/logo-word-wide.svg" alt="" class="h-5 w-auto max-sm:hidden md:h-7" draggable="false" />
      </NuxtLink>
      <span v-if="subtitle" class="type-10-caps text-neutral-11">{{ subtitle }}</span>
      </span>
      <h1 v-else class="type-16-caps md:type-20-caps truncate">{{ title }}</h1>
      </slot>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 47.999rem) {
  .kd-bar-side {
    width: calc(var(--n) * 36px + (var(--n) - 1) * 4px);
  }
}
</style>
