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
 * then the bird puffs up and shakes with rage, in a cloud of feathers.
 * Around it, the scene (desktop): the big open orange case it burst out of, low on the left; two closed cases further
 * back on the right, dimmer and softer the further they are; a warm light out of the open one. Each sits at its own
 * depth (moves with the pointer by it, the near ones more).
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
  let drawn = 0
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    // the idle life draws at 30 fps (half the work on a phone, the motion is slow); a poke plays at the full rate
    if (now - jolt > 700 && now - drawn < 31) return
    drawn = now
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
  let inView = false
  const io = new IntersectionObserver(([e]) => {
    inView = !!e?.isIntersecting
    run(inView && document.visibilityState === 'visible')
  })
  io.observe(host.value)
  // back to the tab: only if the banner is still on screen
  const vis = () => run(inView && document.visibilityState === 'visible')
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
// the flustered one puffs up and shakes side to side. Transform only, so it runs on the compositor
const HOPS = [
  { up: 22, tilt: 6, ms: 520 },
  { up: 40, tilt: 10, ms: 600 },
]
const SHAKE_MS = 720

// the scene around the bird, back to front: behind it (under the canvas) and in front of it (over the canvas)
const PROPS = ['crate-back', 'crate-side', 'crate-open'] as const
const propEls = ref<HTMLImageElement[]>([])
// the cases feel the bird: when it comes down they jump a little, the nearer ones more; its rage shake rattles them.
// On their pictures, so it adds up with the pointer's parallax on their wrappers
const KICK: Record<string, number> = { 'crate-open': 1, 'crate-side': 0.7, 'crate-back': 0.35 }
function kickProps(level: number, delay: number) {
  const f = (y: number, r: number) => ({ transform: `translateY(${y}px) rotate(${r}deg)` })
  propEls.value.forEach((img, i) => {
    const k = KICK[img.dataset.k!] ?? 0.5
    const side = i % 2 ? 1 : -1
    img.getAnimations().forEach((a) => a.cancel())
    if (level === 3) {
      const rattle = [1, -1, 0.7, -0.7, 0.4, -0.4]
      img.animate([f(0, 0), ...rattle.map((s, j) => ({ ...f(-4 * k * Math.abs(s), s * side * 3 * k), offset: 0.12 + j * 0.13 })), f(0, 0)], { duration: SHAKE_MS, easing: 'ease-in-out' })
    } else {
      const up = (level === 2 ? 14 : 8) * k
      img.animate(
        [
          { ...f(0, 0), easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          { ...f(-up, side * 2.5 * k), offset: 0.35, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
          { ...f(0, 0), offset: 0.7, easing: 'ease-out' },
          { ...f(-up * 0.2, 0), offset: 0.85, easing: 'ease-in' },
          f(0, 0),
        ],
        { duration: 440, delay },
      )
    }
  })
}
let combo = 0
let lastPoke = 0
let shakeUntil = 0
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
  // one move at a time: a new poke takes over from the last hop, but a shake always runs out
  const el = hop.value
  if (el && now >= shakeUntil) {
    el.getAnimations().forEach((a) => a.cancel())
    // every frame lists the same functions, so each one tweens on its own
    const f = (tx: number, ty: number, r: number, sx: number, sy: number) => ({ transform: `translate(${tx}px, ${ty}px) rotate(${r}deg) scale(${sx}, ${sy})` })
    if (level === 3) {
      // puffed up with rage: swells, shakes hard side to side, the shaking dying down, then settles
      const shakes = [1, -1, 0.85, -0.85, 0.6, -0.6, 0.3]
      el.animate(
        [
          f(0, 0, 0, 1, 1),
          { ...f(0, 6, 0, 1.14, 0.88), offset: 0.08 },
          ...shakes.map((k, i) => ({ ...f(k * 12, -12, k * 7, 1.12, 1.1), offset: 0.14 + i * 0.1 })),
          f(0, 0, 0, 1, 1),
        ],
        { duration: SHAKE_MS, easing: 'ease-in-out' },
      )
      shakeUntil = now + SHAKE_MS
      kickProps(3, 0)
    } else {
      const h = HOPS[level - 1]!
      // each phase its own curve: a quick squash, a rise that slows at the top, a fall that speeds up, a soft settle
      el.animate(
        [
          { ...f(0, 0, 0, 1, 1), easing: 'cubic-bezier(0.33, 0, 0.67, 1)' },
          { ...f(0, 8, 0, 1.12, 0.86), offset: 0.12, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          // mid-air: tilted away from the finger
          { ...f(0, -h.up, dir * h.tilt, 0.93, 1.09), offset: 0.45, easing: 'cubic-bezier(0.55, 0, 0.8, 0.5)' },
          { ...f(0, 3, -dir * 2, 1.06, 0.95), offset: 0.74, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          f(0, 0, 0, 1, 1),
        ],
        { duration: h.ms },
      )
      // the landing, as the bird settles
      kickProps(level, h.ms * 0.72)
    }
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
    <!-- the scene behind the bird: far closed cases, the open case it burst out of -->
    <span class="kd-hen-props pointer-events-none absolute" aria-hidden="true">
      <!-- the warm light spilling up out of the open case -->
      <span class="kd-hen-glow absolute block" />
      <span v-for="k in PROPS" :key="k" class="kd-hen-prop absolute block" :class="`is-${k}`">
        <span class="kd-hen-idle block">
          <img ref="propEls" :src="`/img/hero/${k}.webp`" :data-k="k" alt="" draggable="false" class="block w-full" />
        </span>
      </span>
    </span>
    <!-- the poke sounds load on the first hover or touch (an audio context wants a gesture first) -->
    <button ref="box" type="button" class="kd-hen-poke absolute" :aria-label="$t('hero.pokeLabel')" @pointerenter.once="sfx.pokeLoad()" @pointerdown="sfx.pokeLoad()" @click="poke">
      <span class="kd-hen-lean block size-full">
        <span ref="hop" class="kd-hen-hop block size-full">
          <span ref="host" class="kd-hen-bob relative block size-full" />
        </span>
      </span>
      <!-- the only part that takes a tap: the bird inside the band, never the live strip above nor the big wins below -->
      <span class="kd-hen-hit absolute" aria-hidden="true" />
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
  top: -116px;
  width: 720px;
  height: calc(100% + 190px);
  /* the box reaches over the live strip and the big wins' heading: it takes no taps itself, only its hit area does */
  pointer-events: none;
  -webkit-tap-highlight-color: transparent;
}
.kd-hen-hit {
  pointer-events: auto;
  cursor: pointer;
  border-radius: 45%;
  /* from the band's top (the box starts 116 px above the art, the band 40 px above it) to its foot */
  left: 15%;
  right: 15%;
  top: 86px;
  bottom: 50px;
}
.kd-hen-poke :deep(.kd-hen-cv) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
/* the scene: the same box as the chicken. Each prop moves with the pointer by its depth (--d; the bird is 1), tilts by
   --r, may be mirrored (--sx) */
.kd-hen-props {
  right: -70px;
  top: -116px;
  width: 720px;
  height: calc(100% + 190px);
}
.kd-hen-prop {
  transform: translate3d(calc(var(--px, 0) * var(--d) * 10px), calc(var(--py, 0) * var(--d) * 6px), 0) rotate(var(--r)) scaleX(var(--sx, 1));
  transition: transform var(--dur-slow) var(--ease-out);
}
/* far back, high on the right: a closed case, small, dim and soft */
.kd-hen-prop.is-crate-back {
  --d: 0.2;
  --r: 12deg;
  right: 150px;
  top: 150px;
  width: 140px;
}
/* the depth filters sit on the pictures, under the idle sway: the sway then only moves a finished layer, instead of
   the browser redrawing a filtered (blurred) box every frame */
.kd-hen-prop.is-crate-back img {
  filter: brightness(0.55) contrast(1.15) saturate(1.05) blur(2.5px);
}
/* nearer, low on the right: a closed case side on */
.kd-hen-prop.is-crate-side {
  --d: 0.35;
  --r: -8deg;
  right: 24px;
  bottom: 72px;
  width: 210px;
}
.kd-hen-prop.is-crate-side img {
  filter: brightness(0.8) contrast(1.2) saturate(1.12) blur(1px);
}
/* the open case it burst out of: big, low on the left, lit from inside */
.kd-hen-prop.is-crate-open {
  --d: 0.5;
  --r: -7deg;
  left: 0;
  bottom: 72px;
  width: 340px;
}
.kd-hen-prop.is-crate-open img {
  filter: contrast(1.2) saturate(1.12);
}
/* the light out of the open case, up into the space over it, its top inside the band (never over the live strip); it
   breathes */
.kd-hen-glow {
  left: -90px;
  bottom: 100px;
  width: 460px;
  height: 260px;
  background: radial-gradient(closest-side, rgb(255 184 72 / 0.75), rgb(255 120 30 / 0.24) 60%, transparent);
  transform: translate3d(calc(var(--px, 0) * 4px), calc(var(--py, 0) * 3px), 0);
  animation: kd-hen-glow 4.2s var(--ease-in-out) infinite;
}
@keyframes kd-hen-glow {
  50% {
    opacity: 0.7;
  }
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
    transform: translateY(-8px);
  }
}

/* tablets and phones: the band above the words — the chicken centred in it */
@media (max-width: 1023px) {
  /* the cases close around the bird: the open one low on the left, the closed ones on the right */
  .kd-hen-props {
    right: 50%;
    top: -8px;
    width: min(380px, 100vw);
    height: calc(100% + 16px);
    translate: 50% 0;
  }
  .kd-hen-prop.is-crate-open {
    left: 6px;
    bottom: 18px;
    width: 160px;
  }
  .kd-hen-prop.is-crate-side {
    right: 4px;
    bottom: 26px;
    width: 104px;
  }
  .kd-hen-prop.is-crate-back {
    right: 46px;
    top: 34px;
    width: 72px;
  }
  .kd-hen-prop.is-crate-back img {
    filter: brightness(0.55) contrast(1.15) saturate(1.05) blur(1.5px);
  }
  .kd-hen-glow {
    left: -30px;
    bottom: 40px;
    width: 240px;
    height: 200px;
  }
  .kd-hen-poke {
    right: 50%;
    top: -8px;
    width: 260px;
    height: calc(100% + 16px);
    translate: 50% 0;
  }
  .kd-hen-hit {
    inset: 8px 6%;
  }
  .kd-hen-fx {
    left: -16px;
    right: -16px;
    top: -60px;
    bottom: -320px;
  }
}
/* idle: each case rises and sways a little on its own beat, out of step with the others (--iy how far, --ir how much
   it sways, --id how long, --idl where it starts); between the parallax on the wrapper and a poke's jump on the picture */
.kd-hen-idle {
  will-change: transform;
  animation: kd-hen-idle var(--id, 4.6s) var(--ease-in-out) infinite;
  animation-delay: var(--idl, 0s);
}
@keyframes kd-hen-idle {
  50% {
    transform: translateY(var(--iy, -4px)) rotate(var(--ir, 0.6deg));
  }
}
.kd-hen-prop.is-crate-side {
  --iy: -3px;
  --ir: -0.8deg;
  --id: 3.8s;
  --idl: -1.3s;
}
.kd-hen-prop.is-crate-back {
  --iy: -6px;
  --ir: 1.2deg;
  --id: 5.6s;
  --idl: -2.4s;
}
@media (prefers-reduced-motion: reduce) {
  .kd-hen-bob,
  .kd-hen-idle,
  .kd-hen-glow {
    animation: none;
  }
}
</style>
