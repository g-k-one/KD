<script setup lang="ts">
import type { SeedsResponse } from '#shared/types/api'

/*
 * Provably Fair banner, full width like the home one: one scene from edge to edge with no frame, the light an arc of
 * green hanging from the top and dissolving into the page; the words line up with the page's column. Right: the glass
 * case and the magnifying glass that shows it as code — the player's own seeds (FairLens). A guest sees an example pair.
 */
const props = defineProps<{ seeds: SeedsResponse | null }>()
// the banner's actions do something the page below doesn't already show: check any roll by hand (anyone), see your seeds
const emit = defineEmits<{ verify: []; seeds: [] }>()
const session = useSessionStore()
const EXAMPLE = { serverSeedHash: '04a5a0c3e19b7f2d6a8e41c05b93d7f1e2a6c84b09d3f75e1c2b8a4d6e0f197a', clientSeed: 'e74ea6b316', nonce: 104 }
const pair = computed(() => props.seeds?.active ?? EXAMPLE)
</script>

<template>
  <section class="relative isolate pt-4 pb-6 lg:py-10">
    <!-- the light: an arc of green hanging from the top, brightest in the middle, gone before the page -->
    <span class="kd-fair-glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

    <div class="mx-auto max-w-content">
      <div class="relative flex flex-col p-4 sm:min-h-60 sm:flex-row sm:px-4 sm:py-6 lg:gap-6 lg:py-10 xl:px-0">
        <!-- the art: a band above the words on phones, the right side wider -->
        <div class="relative -mx-4 -mt-4 mb-2 h-52 sm:absolute sm:inset-y-0 sm:right-0 sm:m-0 sm:h-auto sm:w-[52%] lg:-top-6 lg:-bottom-6 lg:w-[620px]">
          <FairLens :hash="pair.serverSeedHash" :client="pair.clientSeed" :nonce="pair.nonce" />
        </div>
        <!-- one plain line and the one thing to do here: the three steps below explain the rest -->
        <div class="pointer-events-none relative z-10 flex flex-col gap-4 sm:max-w-[50%] sm:gap-6 lg:w-[600px] lg:max-w-none lg:justify-center lg:gap-8 [&>*]:pointer-events-auto">
          <div class="flex flex-col gap-1 sm:gap-2">
            <p class="type-12-caps lg:type-16-caps text-success">{{ $t('fair.eyebrow') }}</p>
            <h1 class="text-[28px] leading-8 font-extrabold uppercase sm:text-[36px] sm:leading-10 lg:text-[50px] lg:leading-[54px] lg:tracking-[-0.01em]">
              {{ $t('fair.heroTitle') }}
            </h1>
            <p class="type-14 mt-1 text-neutral-14 lg:type-16-medium lg:w-[520px] lg:text-neutral-13">{{ $t('fair.heroText1') }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UiButton variant="fair" size="l" icon="function" class="max-sm:h-10 max-sm:px-4" @click="emit('verify')">{{ $t('fair.heroVerify') }}</UiButton>
            <UiButton v-if="session.user" variant="ghost" size="l" icon="seeds" class="max-sm:h-10 max-sm:px-3" @click="emit('seeds')">{{ $t('fair.mySeeds') }}</UiButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* the light: deep green → emerald → mint → emerald → teal across the band, a white-hot middle, masked to an arc that
   hangs from the top and fades out on an eased curve (the home banner's, in the page's green) */
.kd-fair-glow {
  background:
    radial-gradient(ellipse 36% 40% at 50% 8%, rgb(220 255 235 / 0.2), transparent 70%),
    linear-gradient(100deg, #04261a, #0c7a45 26%, #19c97a 48%, #7dffb8 58%, #12b76a 74%, #053a3a);
  opacity: 0.5;
  mask-image: radial-gradient(
    ellipse 80% 100% at 50% 0%,
    #000 0%,
    rgb(0 0 0 / 1) 20%,
    rgb(0 0 0 / 0.966) 28%,
    rgb(0 0 0 / 0.869) 36%,
    rgb(0 0 0 / 0.724) 44%,
    rgb(0 0 0 / 0.552) 52%,
    rgb(0 0 0 / 0.379) 60%,
    rgb(0 0 0 / 0.226) 68%,
    rgb(0 0 0 / 0.11) 76%,
    rgb(0 0 0 / 0.037) 84%,
    rgb(0 0 0 / 0.006) 92%,
    rgb(0 0 0 / 0) 100%
  );
}
@media (max-width: 639px) {
  .kd-fair-glow {
    mask-size: 190% 100%;
    mask-position: 50% 0;
    mask-repeat: no-repeat;
  }
}
</style>
