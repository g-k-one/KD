<script setup lang="ts">
/*
 * The home banner's art: KURWADROP's chicken (the Spine rig public/rig/hen, the one that screams out of the reel's gold
 * logo) hovering in mid-air in its setup pose — wings out, beak open — and watching the cursor. The rig has no idle
 * animation, so the life is procedural, on its own bones, every frame: the wings beat slowly, the legs dangle, the comb
 * jiggles, the jaw chatters a little, the head turns a few degrees toward the cursor and both pupils slide toward it
 * (each anywhere inside its own eye). The whole canvas bobs on CSS. With no mouse (phones) the eyes wander on their own.
 * A poke, as many times as you like: the bird squashes, hops away from the finger and lands with a wobble (squash and
 * stretch on its own wrapper), its eyes pop and its wings flap; feathers burst from the very spot that was poked, on the
 * banner's own canvas (so they scroll with the page), and a cluck plays. Quick pokes in a row build up: a bigger hop,
 * then a flustered flip with a cloud of feathers and a frantic squawk.
 * Behind it, two of the site's loot cases (the hero's open case, back and front) at two depths, dimmer and further
 * back, moving less with the pointer than the bird.
 * Its own WebGL canvas, drawn only while on screen; if WebGL is missing the chicken stays out and nothing breaks.
 */
type Spine = typeof import('@esotericsoftware/spine-webgl')

const base = useRuntimeConfig().app.baseURL
const sfx = useSfx()
const haptics = useHaptics()
const box = useTemplateRef<HTMLElement>('box')
const host = useTemplateRef<HTMLElement>('host')
const hop = useTemplateRef<HTMLElement>('hop')
// the feathers' own canvas, a wide area around the bird in the page: they fly and fall with the page, not the screen
const fxLayer = useTemplateRef<HTMLElement>('fxLayer')
const fx = useForge(fxLayer)

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
// how hard the last poke was: 1, 2 (a few quick ones), 3 (flustered)
let joltLevel = 1

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
    const kick = Math.max(0, 1 - (now - jolt) / (joltLevel > 1 ? 650 : 480))
    const k = kick * (0.8 + joltLevel * 0.35)
    const beat = Math.sin(t * Math.PI * 2 * 1.1)
    B.wingL.pose.rotation += beat * 9 + k * 22 * Math.sin(now / 26)
    B.wingR.pose.rotation -= beat * 9 + k * 22 * Math.sin(now / 26)
    B.thighL.pose.rotation += Math.sin(t * 2.3) * 6
    B.thighR.pose.rotation += Math.sin(t * 2.3 + 1.3) * 6
    B.tail.pose.rotation += Math.sin(t * 1.7) * 4
    B.jaw.pose.rotation += Math.sin(t * 9) * 2.5 + k * 14
    B.spk.forEach((b, i) => (b.pose.rotation += Math.sin(t * 3.1 + i) * 5 + k * 16 * Math.sin(now / 40 + i)))
    // a poke pops the eyes: the whites swell, the pupils shrink to dots, easing back as the kick fades
    for (const [eye, pup] of B.eyes) {
      eye.pose.scaleX = eye.pose.scaleY = 1 + kick * 0.22
      pup.pose.scaleX = pup.pose.scaleY = 1 - kick * 0.45
    }
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

// the hop on the bird's own wrapper: a squash, a jump away from the finger with a stretch, a landing with a wobble;
// the flustered one is a full flip. Transform only, so it runs on the compositor
const HOPS = [
  { up: 22, tilt: 6, ms: 520 },
  { up: 40, tilt: 10, ms: 600 },
  { up: 70, tilt: 360, ms: 760 },
]
let combo = 0
let lastPoke = 0
let flipUntil = 0
function poke(e: MouseEvent) {
  const now = performance.now()
  combo = now - lastPoke < 900 ? combo + 1 : 1
  lastPoke = now
  const level = combo >= 6 ? 3 : combo >= 3 ? 2 : 1
  jolt = now
  joltLevel = level
  if (level === 3) combo = 0
  const b = box.value!.getBoundingClientRect()
  // where the finger landed (a key press pokes the middle of the bird)
  const x = e.detail ? e.clientX : b.left + b.width / 2
  const y = e.detail ? e.clientY : b.top + b.height * 0.45
  const dir = x < b.left + b.width / 2 ? 1 : -1
  const h = HOPS[level - 1]!
  // one hop at a time: a new poke takes over from the last one, but a flip always lands first
  const el = hop.value
  if (el && now >= flipUntil) {
    el.getAnimations().forEach((a) => a.cancel())
    // every frame lists the same functions, so each one tweens on its own (the flip turns, it doesn't snap)
    const end = level === 3 ? dir * 360 : 0
    const f = (ty: number, r: number, sx: number, sy: number) => ({ transform: `translateY(${ty}px) rotate(${r}deg) scale(${sx}, ${sy})` })
    el.animate(
      // each phase its own curve: a quick squash, a rise that slows at the top, a fall that speeds up, a soft settle
      [
        { ...f(0, 0, 1, 1), easing: 'cubic-bezier(0.33, 0, 0.67, 1)' },
        { ...f(8, 0, 1.12, 0.86), offset: 0.12, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        // mid-air: tilted away from the finger; flustered, upside down halfway through the flip
        { ...f(-h.up, dir * (level === 3 ? 180 : h.tilt), 0.93, 1.09), offset: 0.45, easing: 'cubic-bezier(0.55, 0, 0.8, 0.5)' },
        { ...f(3, level === 3 ? end : -dir * 2, 1.06, 0.95), offset: 0.74, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        f(0, end, 1, 1),
      ],
      { duration: h.ms },
    )
    if (level === 3) flipUntil = now + h.ms
  }
  // the feathers burst from the poke itself, more of them the harder it gets; flustered, a cloud from the whole bird
  const l = fxLayer.value?.getBoundingClientRect()
  if (l) {
    fx.play('feathers:white', { x: x - l.left, y: y - l.top, size: [200, 280, 320][level - 1] })
    if (level === 3) fx.play('feathers:white', { x: b.left + b.width / 2 - l.left, y: b.top + b.height * 0.5 - l.top, size: 560 })
  }
  if (level === 3) haptics.rare()
  else haptics.tap()
  sfx.henPoke(level, combo)
}
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
    <!-- the poke sounds load on the first hover or touch (an audio context wants a gesture first) -->
    <button ref="box" type="button" class="kd-hen-poke absolute" :aria-label="$t('hero.pokeLabel')" @pointerenter.once="sfx.pokeLoad()" @pointerdown="sfx.pokeLoad()" @click="poke">
      <span class="kd-hen-lean block size-full">
        <span ref="hop" class="kd-hen-hop block size-full">
          <span ref="host" class="kd-hen-bob relative block size-full" />
        </span>
      </span>
    </button>
    <!-- the feathers' canvas: wide around the bird and down over the big wins, under nothing that takes a tap -->
    <span ref="fxLayer" class="kd-hen-fx pointer-events-none absolute" aria-hidden="true" />
  </div>
</template>

<style scoped>
/* the chicken's box: from above the band's top padding (the canvas is clear there, the comb stays under the strip) down
   past the band's foot into the empty right end of the big wins' heading line, so the bird is big while the band keeps
   its height */
.kd-hen-poke {
  right: -70px;
  top: -100px;
  width: 720px;
  height: calc(100% + 190px);
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
  left: -50px;
  bottom: 30px;
  width: 300px;
  filter: brightness(0.7) saturate(0.9);
}
.kd-hen-crate.is-b {
  --d: 0.25;
  --r: 14deg;
  right: 40px;
  top: 150px;
  width: 170px;
  filter: brightness(0.45) saturate(0.8) blur(2px);
}
.kd-hen-lean {
  transform: translate3d(calc(var(--px, 0) * 10px), calc(var(--py, 0) * 6px), 0);
  transition: transform var(--dur-slow) var(--ease-out);
}
/* the hop squashes from the feet */
.kd-hen-hop {
  transform-origin: 50% 82%;
}
/* the feathers' area: the bird's box and well around it, down past the band over the big wins' cards */
.kd-hen-fx {
  z-index: 3;
  left: -320px;
  right: -140px;
  top: -140px;
  bottom: -380px;
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
  .kd-hen-fx {
    left: -16px;
    right: -16px;
    top: -60px;
    bottom: -320px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-hen-bob {
    animation: none;
  }
}
</style>
