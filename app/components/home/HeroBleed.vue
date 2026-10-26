<script setup lang="ts">
import type { FeedDrop } from '#shared/types/api'

/*
 * Home banner, full width (variants a and c, useHeroVariant). One scene from edge to edge with no frame: the ground's
 * light sits behind the case art in the content column and fades into the page below; the words stay in the column.
 * Wide screens: more loot hangs in the side margins, dimmer and further away, moving with the pointer like the stage.
 * `live` (c): the latest real drops from the live feed drift right to left behind it all, strong in the margins and
 * faint behind the words. Only real drops, the same as the strip above.
 */
const props = defineProps<{ live?: boolean }>()
const emit = defineEmits<{ start: [] }>()
const { onMove, onLeave, vars } = usePointerTilt()

// side loot: x from the content column's edge outward, y from the band's top; d = depth (how far the pointer moves it)
const SIDE = [
  { side: 'l', src: '/img/items/cs2/awp-asiimov.webp', x: 40, y: 40, w: 230, r: -18, d: 1.6 },
  { side: 'l', src: '/img/coins/coin.webp', x: 150, y: 240, w: 46, r: 20, d: 2.2 },
  { side: 'l', src: '/img/items/cs2/bayonet-doppler.webp', x: 10, y: 270, w: 150, r: 24, d: 1.2 },
  { side: 'r', src: '/img/items/cs2/ak-47-fire-serpent.webp', x: 30, y: 60, w: 220, r: 14, d: 1.4 },
  { side: 'r', src: '/img/coins/coin.webp', x: 30, y: 300, w: 38, r: -24, d: 2 },
  { side: 'r', src: '/img/items/cs2/driver-gloves-crimson-weave.webp', x: 110, y: 250, w: 150, r: -12, d: 1.8 },
] as const

// c: a snapshot of the feed, renewed each time the slow row comes round, so the band doesn't jump on every poll
const { feed } = useLiveFeed()
const drops = ref<FeedDrop[]>([])
function snapshot() {
  const seen = new Set<string>()
  drops.value = (feed.value?.drops ?? []).filter((d) => !seen.has(d.image) && seen.add(d.image)).slice(0, 14)
}
watch(
  () => feed.value?.drops.length,
  () => props.live && !drops.value.length && snapshot(),
  { immediate: true },
)
// each row repeated to at least 12 (≈ 2250 px), wider than any screen, so its loop never shows an empty end
const rows = computed(() => {
  const half = Math.ceil(drops.value.length / 2)
  return [drops.value.slice(0, half), drops.value.slice(half)]
    .filter((r) => r.length)
    .map((r) => Array.from({ length: Math.max(r.length, 12) }, (_, i) => ({ ...r[i % r.length]!, key: `${i}-${r[i % r.length]!.id}` })))
})

// the drift only runs while the band is on screen
const band = useTemplateRef<HTMLElement>('band')
const onScreen = useElementVisibility(band)
</script>

<template>
  <section
    ref="band"
    class="kd-bleed relative isolate pt-4 pb-6 lg:pt-10 lg:pb-12"
    :class="!onScreen && 'is-paused'"
    :style="vars"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <span class="kd-bleed-ground pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

    <!-- c: the latest real drops, drifting -->
    <div v-if="live && rows.length" class="kd-drift pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div v-for="(row, r) in rows" :key="r" class="kd-drift-row absolute flex" :class="`is-row-${r}`" @animationiteration="r === 0 && snapshot()">
        <!-- twice, so the loop has no seam -->
        <template v-for="copy in 2" :key="copy">
          <span v-for="d in row" :key="`${copy}-${d.key}`" class="kd-drift-item relative grid shrink-0 place-items-center" :style="{ '--glow': RARITY_COLOR[d.rarity] }">
            <img :src="d.image" alt="" class="relative w-full object-contain" loading="lazy" draggable="false" />
          </span>
        </template>
      </div>
    </div>

    <!-- a: loot in the side margins, wide screens only (c fills them with the drift instead) -->
    <div v-if="!live" class="kd-side pointer-events-none absolute inset-0 -z-10 hidden min-[1500px]:block" aria-hidden="true">
      <img
        v-for="(l, i) in SIDE"
        :key="i"
        :src="l.src"
        alt=""
        class="kd-side-item absolute"
        :class="l.side === 'l' ? 'is-l' : 'is-r'"
        :style="{ '--x': `${l.x}px`, top: `${l.y}px`, width: `${l.w}px`, '--r': `${l.r}deg`, '--d': l.d, '--i': i }"
        draggable="false"
      />
    </div>

    <div class="mx-auto max-w-content">
      <HomeHeroBanner bare @start="emit('start')" />
    </div>
  </section>
</template>

<style scoped>
/* the ground: the case's warm light behind the art in the column (its right side), the site's near-black at the
   screen's edges, fading into the page at the bottom */
.kd-bleed-ground {
  background:
    radial-gradient(760px 440px at calc(50% + 300px) 70%, rgb(255 110 30 / 0.42), transparent 70%),
    radial-gradient(520px 280px at calc(50% + 280px) 100%, rgb(255 190 80 / 0.22), transparent 70%),
    radial-gradient(1300px 560px at calc(50% + 160px) 55%, #2a1209, transparent 72%);
  mask-image: linear-gradient(180deg, #000 72%, transparent);
}
@media (max-width: 639px) {
  /* phones: the art is a band on top, the light with it */
  .kd-bleed-ground {
    background:
      radial-gradient(90% 200px at 50% 130px, rgb(255 110 30 / 0.4), transparent 72%),
      radial-gradient(140% 360px at 50% 120px, #2a1209, transparent 75%);
  }
}

/* a: margin loot sits outside the 1232 px column; the pointer moves near ones more, a slow bob keeps them alive */
.kd-side-item {
  --edge: calc(50% + 616px + var(--x));
  filter: brightness(0.62) saturate(0.85);
  opacity: 0.85;
  transform: translate3d(calc(var(--px, 0) * var(--d) * 14px), calc(var(--py, 0) * var(--d) * 10px), 0) rotate(var(--r));
  transition: transform 600ms var(--ease-out);
}
.kd-side-item.is-l {
  right: var(--edge);
}
.kd-side-item.is-r {
  left: var(--edge);
}

/* c: two rows drifting right to left at different speeds; strong in the margins, faint behind the words */
.kd-drift {
  mask-image:
    linear-gradient(90deg, #000, #000 calc(50% - 720px), rgb(0 0 0 / 0.14) calc(50% - 560px), rgb(0 0 0 / 0.14) calc(50% + 200px), #000 calc(50% + 640px)),
    linear-gradient(180deg, #000 70%, transparent);
  mask-composite: intersect;
}
.kd-drift-row {
  animation: kd-drift 90s linear infinite;
  will-change: transform;
}
.kd-drift-row.is-row-0 {
  top: 6%;
}
.kd-drift-row.is-row-1 {
  top: 52%;
  animation-duration: 120s;
  animation-delay: -40s;
}
.kd-bleed.is-paused .kd-drift-row {
  animation-play-state: paused;
}
.kd-drift-item {
  width: 132px;
  /* a margin, not a gap: the two copies are then exact halves and -50% loops without a seam */
  margin-right: 56px;
  opacity: 0.5;
}
/* the drop's rarity as a soft pool under it, like the strip's tiles */
.kd-drift-item::before {
  content: '';
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  background: radial-gradient(closest-side, var(--glow), transparent);
  opacity: 0.45;
}
@keyframes kd-drift {
  to {
    transform: translate3d(-50%, 0, 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-drift-row {
    animation: none;
  }
}
</style>
