<script setup lang="ts">
/*
 * The home banner's art: KURWADROP's chicken (the Spine rig public/rig/hen, the one that screams out of the reel's gold
 * logo) hovering in mid-air in its setup pose — wings out, beak open — and watching the cursor. The rig has no idle
 * animation, so the life is procedural, on its own bones, every frame: the wings beat slowly, the legs dangle, the comb
 * jiggles, the jaw chatters a little, the head turns a few degrees toward the cursor and both pupils slide toward it
 * (each anywhere inside its own eye). The whole canvas bobs on CSS. With no mouse (phones) the eyes wander on their own.
 * A poke: a jolt, a squawk, feathers; the banner counts the pokes (its bubble and the golden egg), the fifth bursts gold.
 * Behind it, two of the site's loot cases (the hero's open case, back and front) at two depths, dimmer and further
 * back, moving less with the pointer than the bird.
 * Its own WebGL canvas, drawn only while on screen; if WebGL is missing the chicken stays out and nothing breaks.
 */
type Spine = typeof import('@esotericsoftware/spine-webgl')

const props = defineProps<{ bubble?: string; pokes?: number }>()
const emit = defineEmits<{ poke: [] }>()
const base = useRuntimeConfig().app.baseURL
const sfx = useSfx()
const haptics = useHaptics()
const fx = useForge()

const box = useTemplateRef<HTMLElement>('box')
const host = useTemplateRef<HTMLElement>('host')
const ok = ref(false)

const VIEW_H = 470 // skeleton units shown top to bottom (the hen is ~450 tall: it nearly fills its box)
const CENTER_Y = 28 // the hen's middle in skeleton units
// how far each pupil may sit from its eye's centre, skeleton units (the white's radius less the pupil's and the rim):
// the near eye is big (white 77, pupil 24), the far one (eyeR) small (white 40, pupil 12)
const PUPIL = { eyeL: 20, eyeR: 10 }
// how far down a pupil may go, as a share of that: the beak covers the lower part of the far eye
const DOWN = { eyeL: 1, eyeR: 0.25 }
const MAX_PX = 1400

let stop = () => {}
// where the eyes look, in skeleton units: eased toward the target every frame
const look = { x: 0, y: CENTER_Y + 60 }
const target = { x: 0, y: CENTER_Y + 60 }
let lastMove = 0
let jolt = 0

onMounted(async () => {
  if (!host.value || !box.value) return
  let spine: Spine
  let json: unknown
  try {
    ;[spine, json] = await Promise.all([import('@esotericsoftware/spine-webgl'), fetch(`${base}rig/hen/hen.json`).then((r) => r.json())])
  } catch {
    return
  }
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.className = 'kd-hen-cv'
  let ctx: InstanceType<Spine['ManagedWebGLRenderingContext']>
  try {
    ctx = new spine.ManagedWebGLRenderingContext(canvas, { alpha: true, premultipliedAlpha: true, antialias: true })
  } catch {
    return
  }
  const renderer = new spine.SceneRenderer(canvas, ctx)
  const atlas = (await new spine.AssetManager(ctx).loadTextureAtlasAsync(`${base}rig/hen/hen.atlas`)) as InstanceType<Spine['TextureAtlas']>
  const data = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(json)
  const sk = new spine.Skeleton(data)
  const bone = (n: string) => sk.findBone(n)!
  const B = {
    wingL: bone('wingL'),
    wingR: bone('wingR'),
    thighL: bone('thighL'),
    thighR: bone('thighR'),
    jaw: bone('jaw'),
    head: bone('head'),
    tail: bone('tail'),
    spk: ['spk_L', 'spk_T', 'spk_R', 'spk_B'].map(bone),
    eyes: [
      [bone('eyeL'), bone('pupL')],
      [bone('eyeR'), bone('pupR')],
    ] as const,
  }
  host.value.appendChild(canvas)
  ok.value = true

  // the canvas fills the box; its backing store follows its size (DPR ≤ 2, capped)
  let w = 1
  let h = 1
  const fit = () => {
    const r = host.value!.getBoundingClientRect()
    w = Math.max(1, r.width)
    h = Math.max(1, r.height)
    const k = Math.min(2, devicePixelRatio || 1, MAX_PX / Math.max(w, h))
    canvas.width = Math.round(w * k)
    canvas.height = Math.round(h * k)
  }
  fit()
  const ro = new ResizeObserver(fit)
  ro.observe(host.value)

  // the cursor anywhere on the page, in skeleton units (the camera shows VIEW_H units top to bottom, centred on the hen)
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const r = canvas.getBoundingClientRect()
    const u = VIEW_H / Math.max(1, r.height)
    target.x = (e.clientX - (r.left + r.width / 2)) * u
    target.y = CENTER_Y - (e.clientY - (r.top + r.height / 2)) * u
    lastMove = performance.now()
  }
  addEventListener('pointermove', onMove)

  const v = new spine.Vector2()
  let raf = 0
  let t0 = 0
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (!t0) t0 = now
    const t = (now - t0) / 1000
    // no mouse for a while: the eyes wander between a few spots on their own
    if (now - lastMove > 2500) {
      const slot = Math.floor(t / 2.2)
      const a = Math.sin(slot * 12.9898) * 43758.5453
      const rnd = a - Math.floor(a)
      target.x = (rnd - 0.5) * 900
      target.y = CENTER_Y + (Math.cos(slot * 7.3) * 0.5 + 0.2) * 400
    }
    look.x += (target.x - look.x) * 0.14
    look.y += (target.y - look.y) * 0.14

    sk.setupPose()
    // the beat: slow wing strokes, dangling legs, a chattering jaw, a jiggling comb; a poke shakes it all for a moment
    const kick = Math.max(0, 1 - (now - jolt) / 450)
    const beat = Math.sin(t * Math.PI * 2 * 1.1)
    B.wingL.pose.rotation += beat * 9 + kick * 18 * Math.sin(now / 30)
    B.wingR.pose.rotation -= beat * 9 + kick * 18 * Math.sin(now / 30)
    B.thighL.pose.rotation += Math.sin(t * 2.3) * 6
    B.thighR.pose.rotation += Math.sin(t * 2.3 + 1.3) * 6
    B.tail.pose.rotation += Math.sin(t * 1.7) * 4
    B.jaw.pose.rotation += Math.sin(t * 9) * 2.5 + kick * 10
    B.spk.forEach((b, i) => (b.pose.rotation += Math.sin(t * 3.1 + i) * 5 + kick * 12 * Math.sin(now / 40 + i)))
    // the head turns a little toward what it looks at
    B.head.pose.rotation += Math.max(-7, Math.min(7, -look.x / 60)) + Math.max(-5, Math.min(5, (look.y - CENTER_Y - 120) / 70))
    sk.updateWorldTransform(spine.Physics.update)
    // each pupil sits on the line from its eye's centre toward the look point: the further the point, the nearer the
    // white's edge, never past it — both eyes move the whole way their own size allows
    for (const [eye, pup] of B.eyes) {
      const name = eye.data.name as keyof typeof PUPIL
      const e = eye.appliedPose
      const dx = look.x - e.worldX
      const dy = look.y - e.worldY
      const len = Math.hypot(dx, dy) || 1
      const s = Math.min(PUPIL[name], len * 0.12) / len
      v.set(e.worldX + dx * s, e.worldY + dy * s * (dy < 0 ? DOWN[name] : 1))
      e.worldToLocal(v)
      pup.pose.x = v.x
      pup.pose.y = v.y
    }
    sk.updateWorldTransform(spine.Physics.update)

    const gl = ctx.gl
    renderer.camera.setViewport((VIEW_H * w) / h, VIEW_H)
    renderer.camera.position.set(0, CENTER_Y, 0)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    renderer.begin()
    renderer.drawSkeleton(sk)
    renderer.end()
  }

  // draw only while on screen and the tab is visible
  const run = (on: boolean) => {
    cancelAnimationFrame(raf)
    if (on) raf = requestAnimationFrame(frame)
  }
  const io = new IntersectionObserver(([e]) => run(!!e?.isIntersecting && document.visibilityState === 'visible'))
  io.observe(host.value)
  const vis = () => run(document.visibilityState === 'visible')
  document.addEventListener('visibilitychange', vis)

  stop = () => {
    cancelAnimationFrame(raf)
    io.disconnect()
    ro.disconnect()
    removeEventListener('pointermove', onMove)
    document.removeEventListener('visibilitychange', vis)
    renderer.dispose()
    canvas.remove()
  }
})
onBeforeUnmount(() => stop())

function poke() {
  jolt = performance.now()
  haptics.tap()
  sfx.squawk()
  fx.at('feathers:white', box.value, 0.9)
  emit('poke')
}
watch(
  () => props.pokes,
  (n) => {
    if (n === 5) {
      haptics.jackpot()
      fx.at('kdJackpot', box.value, 1.2)
    }
  },
)
</script>

<template>
  <div class="kd-hen absolute inset-0">
    <!-- the cases behind: a big one low on the left, a small far one high on the right -->
    <span class="kd-hen-crates pointer-events-none absolute" aria-hidden="true">
      <span v-for="c in ['a', 'b']" :key="c" class="kd-hen-crate absolute block" :class="`is-${c}`">
        <img src="/img/hero/case-back.webp" alt="" draggable="false" class="absolute inset-0 w-full" />
        <img src="/img/hero/case-front.webp" alt="" draggable="false" class="absolute inset-0 w-full" />
      </span>
    </span>
    <button ref="box" type="button" class="kd-hen-poke absolute" :aria-label="$t('hero.pokeLabel')" @click="poke">
      <span class="kd-hen-lean block size-full">
        <span ref="host" class="kd-hen-bob relative block size-full" />
      </span>
    </button>
    <span v-if="bubble && ok" class="kd-hen-bubble type-12-caps lg:type-14-caps absolute rounded-lg px-2.5 py-1.5">{{ bubble }}</span>
  </div>
</template>

<style scoped>
/* the chicken's box: from just above the band's top padding (the canvas is clear there, the comb stays under the
   strip) down past the band's foot into the empty right end of the big wins' heading line, so the bird is big while the
   band keeps its height */
.kd-hen-poke {
  right: -40px;
  top: -70px;
  width: 640px;
  height: calc(100% + 120px);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.kd-hen-poke :deep(.kd-hen-cv) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
/* the cases: the same box as the chicken; each moves with the pointer by its depth, less than the bird */
.kd-hen-crates {
  right: -40px;
  top: -70px;
  width: 640px;
  height: calc(100% + 120px);
}
.kd-hen-crate {
  aspect-ratio: 720 / 691;
  transform: translate3d(calc(var(--px, 0) * var(--d) * 10px), calc(var(--py, 0) * var(--d) * 6px), 0) rotate(var(--r));
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-hen-crate.is-a {
  --d: 0.5;
  --r: -10deg;
  left: 40px;
  bottom: 18px;
  width: 300px;
  filter: brightness(0.7) saturate(0.9);
}
.kd-hen-crate.is-b {
  --d: 0.25;
  --r: 14deg;
  right: 10px;
  top: 40px;
  width: 170px;
  filter: brightness(0.45) saturate(0.8) blur(2px);
}
.kd-hen-lean {
  transform: translate3d(calc(var(--px, 0) * 10px), calc(var(--py, 0) * 6px), 0);
  transition: transform var(--dur-slow) var(--ease-out);
}
/* hovering: the whole bird rides up and down */
.kd-hen-bob {
  animation: kd-hen-bob 3.2s var(--ease-in-out) infinite;
}
@keyframes kd-hen-bob {
  50% {
    transform: translateY(-14px);
  }
}
.kd-hen-bubble {
  right: 60px;
  top: 0;
  z-index: 2;
  color: var(--color-neutral-1);
  background: var(--color-neutral-15);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.35);
}

/* tablets and phones: the band above the words — the chicken centred in it */
@media (max-width: 1023px) {
  .kd-hen-crates {
    display: none;
  }
  .kd-hen-poke {
    right: 50%;
    top: -8px;
    width: 260px;
    height: calc(100% + 16px);
    translate: 50% 0;
  }
  .kd-hen-bubble {
    right: 12%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-hen-bob {
    animation: none;
  }
}
</style>
