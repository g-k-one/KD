<script setup lang="ts">
import type { AdminCase } from '#shared/types/api'

/*
 * Admin · a case's pictures, one slot per version: what it is for, its shape and size, a preview on the site's
 * ground, Upload and (for the optional ones) Remove. An upload is scaled down and kept as an image (the prototype has
 * no file storage; the real admin uploads to the CDN). The square one is required: the case uses it everywhere.
 */
const draft = defineModel<AdminCase>({ required: true })

type Slot = 'image' | 'full' | 'wide' | 'tall'
const SLOTS: Array<{ key: Slot; title: string; use: string; shape: string; box: string; max: [number, number]; ground: boolean }> = [
  { key: 'image', title: 'Square', use: 'The reel, the case page, history, the live feed, PvP and upgrades. Required.', shape: '1:1 · 512 × 512 · transparent', box: 'aspect-square', max: [512, 512], ground: false },
  { key: 'full', title: 'Full card', use: 'A home card filled with a scene (card kind Full).', shape: '2:3 · 480 × 720 · with its ground', box: 'aspect-[2/3]', max: [600, 900], ground: true },
  { key: 'wide', title: 'Wide 2×1', use: 'A wide home card on desktop (card kind 2×1).', shape: '16:9 · 800 × 450 · transparent', box: 'aspect-video', max: [1000, 563], ground: false },
  { key: 'tall', title: 'Tall 1×2', use: 'A tall home card on desktop, rows of 6+ (card kind 1×2).', shape: '9:16 · 360 × 640 · transparent', box: 'aspect-[9/16]', max: [450, 800], ground: false },
]
const src = (k: Slot) => (k === 'image' ? draft.value.image : draft.value.art[k])
const toast = useToast()

/** Scale a picked file down to the slot's size and keep it as a WebP data URL (transparency kept) */
async function pick(k: Slot, e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/^image\/(png|webp|jpeg|avif)$/.test(file.type)) return toast.error(new Error('PNG, WebP, JPEG or AVIF'), 'Not a picture')
  const slot = SLOTS.find((s) => s.key === k)!
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, slot.max[0] / bmp.width, slot.max[1] / bmp.height)
    const cv = document.createElement('canvas')
    cv.width = Math.round(bmp.width * scale)
    cv.height = Math.round(bmp.height * scale)
    cv.getContext('2d')!.drawImage(bmp, 0, 0, cv.width, cv.height)
    const url = cv.toDataURL('image/webp', 0.86)
    if (k === 'image') draft.value.image = url
    else draft.value.art = { ...draft.value.art, [k]: url }
  } catch (err) {
    toast.error(err, 'Could not read the picture')
  }
}
function remove(k: Exclude<Slot, 'image'>) {
  const art = { ...draft.value.art }
  delete art[k]
  draft.value.art = art
  if (draft.value.card === k) draft.value.card = 'standard'
}
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <div v-for="s in SLOTS" :key="s.key" class="flex min-w-0 flex-col gap-2">
      <!-- the preview: transparent pictures on the site's ground with a checker hint, scenes as they are -->
      <label class="kd-art-slot relative grid cursor-pointer place-items-center overflow-hidden rounded-2xl" :class="[s.box, !src(s.key) && 'is-empty', !s.ground && 'is-alpha']">
        <img v-if="src(s.key)" :src="src(s.key)" alt="" class="size-full" :class="s.ground ? 'object-cover' : 'object-contain p-2'" />
        <span v-else class="flex flex-col items-center gap-1 text-neutral-11"><UiIcon name="plus" :size="20" /><span class="type-10-caps">Upload</span></span>
        <input type="file" accept="image/png,image/webp,image/jpeg,image/avif" class="sr-only" @change="pick(s.key, $event)" />
      </label>
      <div class="flex items-center gap-1">
        <span class="type-12-caps min-w-0 flex-1 truncate">{{ s.title }}</span>
        <button v-if="s.key !== 'image' && src(s.key)" type="button" class="kd-hit relative text-neutral-11 hover:text-danger" :aria-label="`Remove ${s.title}`" @click="remove(s.key)"><UiIcon name="x" :size="14" /></button>
      </div>
      <span class="type-10-caps text-neutral-11">{{ s.shape }}</span>
      <span class="type-12-regular text-neutral-11">{{ s.use }}</span>
    </div>
  </div>
  <p v-if="draft.animated" class="type-12-regular text-neutral-11">
    This case is animated from its square picture. Uploading a new square picture switches the animation off.
  </p>
</template>

<style scoped>
.kd-art-slot {
  background: var(--color-neutral-3);
  box-shadow: inset 0 0 0 1px var(--color-neutral-5);
  transition: box-shadow var(--dur-base) var(--ease-out);
}
/* transparent pictures sit on a faint checker, so a missing cut-out shows */
.kd-art-slot.is-alpha {
  background:
    repeating-conic-gradient(rgb(255 255 255 / 0.03) 0 25%, transparent 0 50%) 0 0 / 16px 16px,
    var(--color-neutral-3);
}
.kd-art-slot.is-empty {
  box-shadow: inset 0 0 0 1px var(--color-neutral-6);
}
@media (hover: hover) {
  .kd-art-slot:hover {
    box-shadow: inset 0 0 0 1.5px var(--color-brand-base);
  }
}
</style>
