<script setup lang="ts">
/*
 * Home banner (BannerBleed, warm): KURWADROP's Spine chicken hovering among the crates (HomeHeroHen) on the right.
 * Two voices. A guest gets the pitch and Start playing (sign in). A signed-in player gets greeted by name and the one
 * thing worth doing now: the welcome cases still free, else the daily case if it is ready, else the fresh picks below.
 */
const emit = defineEmits<{ start: [] }>()
const session = useSessionStore()
const ui = useUiStore()
const { t } = useI18n()
const { dailyReady, welcomeLeft } = useBonuses()

// what the signed-in player is offered, most valuable first
const offer = computed(() => {
  if (!session.user) return null
  if (!FEATURES.bonuses) return { title: 'hero.picksTitle', text: 'hero.picksText', n: 0, cta: 'hero.picksCta', icon: 'cases', to: '' }
  if (welcomeLeft.value > 0) return { title: 'hero.freeTitle', text: 'hero.freeText', n: welcomeLeft.value, cta: 'hero.freeCta', icon: 'bonuses', to: '/bonuses' }
  if (dailyReady.value) return { title: 'hero.dailyTitle', text: 'hero.dailyText', n: 0, cta: 'hero.dailyCta', icon: 'bonuses', to: '/bonuses' }
  return { title: 'hero.picksTitle', text: 'hero.picksText', n: 0, cta: 'hero.picksCta', icon: 'cases', to: '' }
})
const eyebrow = computed(() => (session.user ? t('hero.back', { name: session.user.nickname }) : t('hero.eyebrow')))
const title = computed(() => (offer.value ? t(offer.value.title, { n: offer.value.n }, offer.value.n || 1) : t('hero.title')))
const text = computed(() => t(offer.value?.text ?? 'hero.text'))
function start() {
  if (!session.user) ui.openSignIn()
  else emit('start')
}
</script>

<template>
  <BannerBleed glow="warm" :eyebrow="eyebrow" :title="title" :text="text">
    <template #art><HomeHeroHen /></template>
    <template #actions>
      <UiButton v-if="!offer" size="l" class="max-sm:h-10 max-sm:px-4" @click="start">{{ $t('hero.cta') }}</UiButton>
      <UiButton v-else-if="offer.to" size="l" :icon="offer.icon" :to="offer.to" class="max-sm:h-10 max-sm:px-4">{{ $t(offer.cta) }}</UiButton>
      <UiButton v-else size="l" :icon="offer.icon" class="max-sm:h-10 max-sm:px-4" @click="start">{{ $t(offer.cta) }}</UiButton>
      <UiButton variant="ghost" size="l" icon="info" to="/fairness" class="max-sm:h-10 max-sm:px-3">{{ $t('hero.howItWorks') }}</UiButton>
    </template>
  </BannerBleed>
</template>
