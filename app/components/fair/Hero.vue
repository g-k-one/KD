<script setup lang="ts">
import type { SeedsResponse } from '#shared/types/api'

/*
 * Provably Fair banner (BannerBleed, green): the shield, the check and a laptop typing out the player's own check
 * (FairScene); a guest sees an example pair.
 */
const props = defineProps<{ seeds: SeedsResponse | null }>()
// the banner's one action: your seeds (the pair behind your rolls, to change or reveal); a guest signs in first
const emit = defineEmits<{ seeds: [] }>()
const session = useSessionStore()
const ui = useUiStore()
const EXAMPLE = { serverSeedHash: '04a5a0c3e19b7f2d6a8e41c05b93d7f1e2a6c84b09d3f75e1c2b8a4d6e0f197a', clientSeed: 'e74ea6b316', nonce: 104 }
const pair = computed(() => props.seeds?.active ?? EXAMPLE)
</script>

<template>
  <BannerBleed glow="green" :eyebrow="$t('fair.eyebrow')" :title="$t('fair.heroTitle')" :text="$t('fair.heroText1')" art-class="h-44 lg:-top-6 lg:-bottom-6">
    <template #art><FairScene :hash="pair.serverSeedHash" :client="pair.clientSeed" :nonce="pair.nonce" /></template>
    <template #actions>
      <UiButton variant="fair" size="l" icon="seeds" class="max-sm:h-10 max-sm:px-4" @click="session.user ? emit('seeds') : ui.openSignIn()">{{ $t('fair.mySeeds') }}</UiButton>
    </template>
  </BannerBleed>
</template>
