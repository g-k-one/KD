<script setup lang="ts">
import type { InventoryItem } from '#shared/types/api'

/*
 * Share a drop (docs/ux-research-v3.md #7): after a win the player gets a ready picture — the skin, big, on its
 * rarity glow, the multiplier and our logo; no price, case or link on it (the link goes with the post) — to post anywhere. Phones hand it to the system
 * share sheet; desktop copies the picture or the link. The card is drawn on a canvas, 1200×630 (link preview size).
 */
const open = defineModel<boolean>({ required: true })
const props = defineProps<{ item: InventoryItem | null; casePrice: number; slug: string }>()
const toast = useToast()
const { t } = useI18n()

const W = 1200
const H = 630
const blob = shallowRef<Blob | null>(null)
const preview = ref('')
// through the router, so the link works with hash routing too (the artifact)
const router = useRouter()
const link = computed(() => (import.meta.client ? new URL(router.resolve(`/case/${props.slug}`).href, location.href).href : ''))
const mult = computed(() => (props.item ? Math.round((props.item.price / props.casePrice) * 10) / 10 : 0))

// A picture from another site (catalog skins on the Steam CDN) is asked for with CORS, so it can't taint the canvas;
// a host that refuses CORS leaves the card without the skin instead of breaking the export
const load = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image()
    if (/^https?:/.test(src) && new URL(src).origin !== location.origin) img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })

/**
 * Where the picture's visible pixels reach once it is turned by `tilt` around its centre (the catalog art has empty
 * margins, so the card's margin is measured from the gun itself); the whole picture when its pixels can't be read
 */
function visibleBounds(img: HTMLImageElement, tilt: number) {
  const cos = Math.cos(tilt)
  const sin = Math.sin(tilt)
  const w = img.width
  const h = img.height
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  const take = (x: number, y: number) => {
    const rx = (x - w / 2) * cos - (y - h / 2) * sin
    const ry = (x - w / 2) * sin + (y - h / 2) * cos
    x0 = Math.min(x0, rx)
    x1 = Math.max(x1, rx)
    y0 = Math.min(y0, ry)
    y1 = Math.max(y1, ry)
  }
  try {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d', { willReadFrequently: true })!
    g.drawImage(img, 0, 0)
    const { data } = g.getImageData(0, 0, w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3]! > 16) take(x, y)
  } catch {
    // a tainted picture: its corners
  }
  if (x1 < x0) for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]] as const) take(x, y)
  return { x0, x1, y0, y1 }
}

async function draw() {
  const it = props.item
  if (!it) return
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const font = getComputedStyle(document.body).fontFamily
  const tint = RARITY_HEX[it.rarity]

  // one margin all round, the left column's: the logo sits that far from the top, the skin's name from the bottom,
  // the skin's visible edge from the right
  const PAD = 64
  const [skin, logo] = await Promise.all([load(it.image).catch(() => null), load('/img/brand/logo-word.svg').catch(() => null)])
  // the skin, as big as the right side holds inside the margin once tilted; the art is 320×240, so it is scaled up
  // ~2×: the browser's best resampling keeps its edges clean
  const TILT = -0.08
  const vis = skin ? visibleBounds(skin, TILT) : null
  // clear of the left column, whose text is capped at 460 px
  const left = 560
  const k = vis ? Math.min((W - PAD - left) / (vis.x1 - vis.x0), (H - PAD * 2) / (vis.y1 - vis.y0)) : 1
  const cx = vis ? W - PAD - k * vis.x1 : 848
  const cy = vis ? H / 2 - (k * (vis.y0 + vis.y1)) / 2 : H / 2

  // ground: the site's near-black with the drop's rarity glowing behind the skin
  g.fillStyle = '#0c0d10'
  g.fillRect(0, 0, W, H)
  const glow = g.createRadialGradient(cx, cy, 20, cx, cy, 470)
  glow.addColorStop(0, `${tint}cc`)
  glow.addColorStop(0.45, `${tint}33`)
  glow.addColorStop(1, '#0c0d1000')
  g.fillStyle = glow
  g.fillRect(0, 0, W, H)

  if (skin && vis) {
    g.save()
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    g.translate(cx, cy)
    g.rotate(TILT)
    g.shadowColor = 'rgba(0,0,0,0.6)'
    g.shadowBlur = 40
    g.shadowOffsetY = 20
    g.drawImage(skin, (-skin.width * k) / 2, (-skin.height * k) / 2, skin.width * k, skin.height * k)
    g.restore()
  }

  // left column: the logo at the top margin; the multiplier, weapon and skin stacked on the bottom margin
  // (caps have no descenders, so the last baseline is the text's bottom)
  if (logo?.width) g.drawImage(logo, PAD, PAD, 200, (200 * logo.height) / logo.width)
  const base = H - PAD
  g.textBaseline = 'alphabetic'
  g.fillStyle = '#ffc93b'
  g.font = `800 150px ${font}`
  g.fillText(`x${mult.value}`, PAD - 8, base - 116)
  g.fillStyle = '#9aa0ad'
  g.font = `600 30px ${font}`
  g.fillText(it.weapon.toUpperCase(), PAD, base - 54)
  g.fillStyle = tint
  g.font = `800 48px ${font}`
  g.fillText(it.skin.toUpperCase(), PAD, base, 460)

  blob.value = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'))
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = blob.value ? URL.createObjectURL(blob.value) : ''
}
watch(open, (v) => v && draw())
onBeforeUnmount(() => preview.value && URL.revokeObjectURL(preview.value))

const file = () => (blob.value ? new File([blob.value], 'kurwadrop-drop.png', { type: 'image/png' }) : null)
const canShareFile = computed(() => import.meta.client && !!blob.value && !!navigator.canShare?.({ files: [file()!] }))

async function shareSheet() {
  try {
    await navigator.share({ files: [file()!], text: t('share.text', { x: mult.value }), url: link.value })
  } catch {
    // dismissed: nothing to say
  }
}
async function copyImage() {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob.value! })])
    toast.show(t('share.imageCopied'), 'success')
  } catch {
    toast.show(t('share.longPress'))
  }
}
async function copyLink() {
  try {
    await navigator.clipboard.writeText(link.value)
    toast.show(t('case.copied'), 'success')
  } catch {
    toast.show(link.value)
  }
}
</script>

<template>
  <UiModal v-model="open" :title="$t('share.title')" :width="640">
    <div class="overflow-hidden rounded-2xl bg-neutral-1" style="aspect-ratio: 1200 / 630">
      <img v-if="preview" :src="preview" :alt="item ? `${item.weapon} | ${item.skin}` : ''" class="size-full object-cover" />
      <span v-else class="kd-skeleton block size-full" />
    </div>
    <template #actions>
      <div class="grid w-full grid-cols-2 gap-2">
        <UiButton v-if="canShareFile" size="l" icon="share" :disabled="!blob" @click="shareSheet">{{ $t('share.share') }}</UiButton>
        <UiButton v-else size="l" icon="copy" :disabled="!blob" @click="copyImage">{{ $t('share.copyImage') }}</UiButton>
        <UiButton variant="secondary" size="l" icon="copy" @click="copyLink">{{ $t('share.copyLink') }}</UiButton>
      </div>
    </template>
  </UiModal>
</template>
