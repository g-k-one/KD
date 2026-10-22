<script setup lang="ts">
import type { InventoryItem } from '#shared/types/api'

/*
 * Share a drop (docs/ux-research-v3.md #7): after a big win the player gets a ready picture — the skin on its
 * rarity glow, the multiplier, the case, our logo and the link — to post anywhere. Phones hand it to the system
 * share sheet; desktop copies the picture or the link. The card is drawn on a canvas, 1200×630 (link preview size).
 */
const open = defineModel<boolean>({ required: true })
const props = defineProps<{ item: InventoryItem | null; caseName: string; caseImage: string; casePrice: number; slug: string }>()
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

const load = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })

async function draw() {
  const it = props.item
  if (!it) return
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const font = getComputedStyle(document.body).fontFamily
  const tint = RARITY_HEX[it.rarity]

  // ground: the site's near-black with the drop's rarity glowing behind the skin
  g.fillStyle = '#0c0d10'
  g.fillRect(0, 0, W, H)
  const glow = g.createRadialGradient(820, 330, 20, 820, 330, 420)
  glow.addColorStop(0, `${tint}cc`)
  glow.addColorStop(0.45, `${tint}33`)
  glow.addColorStop(1, '#0c0d1000')
  g.fillStyle = glow
  g.fillRect(0, 0, W, H)

  const [skin, box, logo, coin] = await Promise.all([
    load(it.image),
    load(props.caseImage).catch(() => null),
    load('/img/brand/logo-word.svg').catch(() => null),
    load('/img/brand/coin.svg').catch(() => null),
  ])
  // the skin, big, slightly tilted
  g.save()
  g.translate(820, 320)
  g.rotate(-0.08)
  const s = Math.min(760 / skin.width, 480 / skin.height)
  g.shadowColor = 'rgba(0,0,0,0.6)'
  g.shadowBlur = 40
  g.shadowOffsetY = 20
  g.drawImage(skin, (-skin.width * s) / 2, (-skin.height * s) / 2, skin.width * s, skin.height * s)
  g.restore()

  // left column: logo, multiplier, name, price, case
  if (logo?.width) g.drawImage(logo, 64, 56, 200, (200 * logo.height) / logo.width)
  g.textBaseline = 'alphabetic'
  g.fillStyle = '#ffc93b'
  g.font = `800 150px ${font}`
  g.fillText(`x${mult.value}`, 56, 300)
  g.fillStyle = '#9aa0ad'
  g.font = `600 30px ${font}`
  g.fillText(it.weapon.toUpperCase(), 64, 362)
  g.fillStyle = tint
  g.font = `800 48px ${font}`
  g.fillText(it.skin.toUpperCase(), 64, 416, 560)
  g.fillStyle = '#ffffff'
  g.font = `700 36px ${font}`
  if (coin) g.drawImage(coin, 64, 446, 34, 34)
  g.fillText(formatCoins(it.price), coin ? 108 : 64, 474)

  // the case it came from and where to open it
  if (box) g.drawImage(box, 56, 504, 80, 80)
  g.fillStyle = '#ffffff'
  g.font = `700 26px ${font}`
  g.fillText(t('share.from', { name: props.caseName }).toUpperCase(), 148, 538)
  g.fillStyle = '#9aa0ad'
  g.font = `500 24px ${font}`
  g.fillText(link.value.replace(/^https?:\/\//, ''), 148, 572)

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
