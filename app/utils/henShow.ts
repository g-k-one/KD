/*
 * KURWADROP's chicken (Spine rig public/rig/hen, built from GK's PSD by Tasty/hen/make_hen.py): the gold logo on the
 * winning tile zooms in and, at the peak of its flash, turns into the chicken's head; the body comes out of the head,
 * it screams, swells and pops (docs/motion.md → Reel → KURWADROP). One shot, 3 s (Fast — twice as fast).
 *
 * The rig is authored around the logo: at 0.12 s the head is exactly the logo's size and place (150 units tall,
 * centred on (0, LOGO_Y)), so the canvas is scaled from the logo picture and centred on it. Its own WebGL canvas,
 * fixed over the page and riding with the logo every frame, so nothing clips it (the reel's frame, the dock).
 * Events: swap (0.12 s, the logo becomes the head), body (0.13 s), scream (0.82 s), inflate (1.75 s), boom (0.15 s
 * before the pop: Forge's gold burst draws in first), pop (2.15 s). scale < 1 makes the whole chicken smaller (phones):
 * the logo then zooms to 1.55 x scale, so the head still takes its place at the same size.
 *
 * henWarm() gets everything ready ahead of the moment (the runtime, the rig, a GL context with the atlas uploaded and
 * the shaders compiled by a first draw), so the hit itself only attaches a ready canvas: no hitch when the chicken lands.
 */
type Spine = typeof import('@esotericsoftware/spine-webgl')

const VIEW = 1000 // skeleton units across the canvas
const LOGO_H = 150 // the head's height (skeleton units) when it takes the logo's place
const LOGO_Y = -239 // the logo's centre in skeleton units
const POP = 2.15
const SWAP = 0.12
const BODY = 0.13
const INFLATE = 1.75
const MAX_PX = 1600 // the canvas's backing store is capped (a phone does not fill 2000+ px of mostly empty WebGL)
const DONE = POP + 0.35 // the caller moves on here (the respin); the rings keep fading to the end

export interface HenShow {
  /** Resolves true at DONE once the show played; false when it could not (no WebGL, load error) */
  done: Promise<boolean>
  stop(): void
}
export interface HenShowOptions {
  base: string
  fast?: boolean
  scale?: number
  swap?: () => void
  body?: () => void
  scream?: () => void
  inflate?: () => void
  boom?: () => void
  pop?: () => void
}

interface Player {
  spine: Spine
  canvas: HTMLCanvasElement
  ctx: InstanceType<Spine['ManagedWebGLRenderingContext']>
  renderer: InstanceType<Spine['SceneRenderer']>
  data: InstanceType<Spine['SkeletonData']>
}

let rig: Promise<{ spine: Spine; json: unknown; dir: string }> | null = null
function load(base: string) {
  const dir = `${base.endsWith('/') ? base : `${base}/`}rig/hen/`
  rig ??= Promise.all([import('@esotericsoftware/spine-webgl'), fetch(`${dir}hen.json`).then((r) => r.json())]).then(([spine, json]) => ({ spine, json, dir }))
  // a failed load is retried next time
  rig.catch(() => (rig = null))
  return rig
}

/** A canvas with its own GL context, the atlas uploaded and the skeleton read; one first draw compiles the shaders */
async function make(base: string): Promise<Player> {
  const { spine, json, dir } = await load(base)
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:60'
  canvas.width = canvas.height = 2
  const ctx = new spine.ManagedWebGLRenderingContext(canvas, { alpha: true, premultipliedAlpha: true, antialias: true })
  const renderer = new spine.SceneRenderer(canvas, ctx)
  // the atlas is uploaded per canvas (its own GL context); the browser caches the file
  const atlas = (await new spine.AssetManager(ctx).loadTextureAtlasAsync(`${dir}hen.atlas`)) as InstanceType<Spine['TextureAtlas']>
  const data = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(json)
  const sk = new spine.Skeleton(data)
  sk.setupPose()
  sk.updateWorldTransform(spine.Physics.reset)
  renderer.begin()
  renderer.drawSkeleton(sk)
  renderer.end()
  return { spine, canvas, ctx, renderer, data }
}

// one ready player waits for the next chicken; a second chicken at once (multi-open) makes its own
let ready: Promise<Player> | null = null
/** Prepares the chicken while the page is idle (call when KURWADROP is switched on) */
export function henWarm(base: string) {
  if (ready || !import.meta.client) return
  const go = () => {
    ready ??= make(base)
    ready.catch(() => (ready = null))
  }
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2000 })
  else setTimeout(go, 300)
}
function take(base: string) {
  const p = ready ?? make(base)
  ready = null
  return p
}

/** Plays the chicken out of `logo` (the gold logo picture on the winning tile); `tile` gets the logo's swap classes */
export function henShow(logo: HTMLElement, tile: HTMLElement, o: HenShowOptions): HenShow {
  let stopped = false
  let raf = 0
  let player: Player | null = null
  let finish: (v: boolean) => void = () => {}
  const done = new Promise<boolean>((r) => (finish = r))
  const clean = () => {
    cancelAnimationFrame(raf)
    tile.classList.remove('is-hen-out', 'is-hen-back')
    tile.style.removeProperty('--hen-zoom')
    if (!player) return
    // back to the pool for the next chicken (the GL context, the texture and the shaders stay ready)
    player.canvas.remove()
    ready ??= Promise.resolve(player)
    player = null
  }

  take(o.base)
    .then((p) => {
      if (stopped) {
        ready ??= Promise.resolve(p)
        return
      }
      player = p
      const { spine, canvas, ctx, renderer, data } = p
      const sk = new spine.Skeleton(data)
      const state = new spine.AnimationState(new spine.AnimationStateData(data))
      state.timeScale = o.fast ? 2 : 1
      const beats: [number, (() => void) | undefined][] = [[SWAP, o.swap], [BODY, o.body], [INFLATE, o.inflate], [POP - 0.15, o.boom]]
      let told = false
      state.addListener({
        event: (_, e) => {
          if (e.data.name === 'scream') o.scream?.()
          if (e.data.name === 'pop') {
            tile.classList.remove('is-hen-out')
            tile.classList.add('is-hen-back')
            o.pop?.()
          }
        },
        complete: () => {
          if (!told) finish(true)
          told = true
          clean()
        },
      })
      state.setAnimation(0, 'show', false)
      sk.setupPose()
      state.apply(sk)
      sk.updateWorldTransform(spine.Physics.reset)
      // the logo breathes in and is gone at the flash's peak, where the rig's head appears at that same size
      const k = o.scale ?? 1
      tile.style.setProperty('--hen-k', o.fast ? '0.5' : '1')
      tile.style.setProperty('--hen-zoom', String(1.55 * k))
      tile.classList.add('is-hen-out')
      document.body.appendChild(canvas)
      let last = 0
      let cssSize = 0
      const frame = (now: number) => {
        if (stopped || player !== p) return
        raf = requestAnimationFrame(frame)
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
        last = now
        // ride with the logo: a canvas of VIEW units where LOGO_H units = the logo picture's height
        const r = logo.getBoundingClientRect()
        const size = (r.height / LOGO_H) * VIEW * k
        const px = Math.round(Math.min(size * Math.min(2, devicePixelRatio || 1), MAX_PX))
        if (canvas.width !== px) canvas.width = canvas.height = px
        if (size !== cssSize) canvas.style.width = canvas.style.height = `${(cssSize = size)}px`
        canvas.style.transform = `translate(${r.left + r.width / 2 - size / 2}px, ${r.top + r.height / 2 - size / 2}px)`
        state.update(dt)
        state.apply(sk)
        sk.updateWorldTransform(spine.Physics.update)
        const t = state.tracks[0]?.trackTime ?? 0
        while (beats.length && t >= beats[0]![0]) beats.shift()![1]?.()
        if (!told && t >= DONE) {
          told = true
          finish(true)
        }
        if (player !== p) return
        renderer.camera.setViewport(VIEW, VIEW)
        renderer.camera.position.set(0, LOGO_Y, 0)
        const gl = ctx.gl
        gl.viewport(0, 0, px, px)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        renderer.begin()
        renderer.drawSkeleton(sk)
        renderer.end()
      }
      raf = requestAnimationFrame(frame)
    })
    .catch(() => {
      clean()
      finish(false)
    })

  return {
    done,
    stop() {
      stopped = true
      clean()
      finish(true)
    },
  }
}
