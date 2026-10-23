import type { CaseRig } from '#shared/types/api'

/*
 * One Spine runtime for the whole page. A single offscreen WebGL canvas draws every playing rig in
 * turn and each card copies its frame onto its own 2D canvas, so cards never pile up WebGL contexts
 * (browsers cap them at ~16) and the atlas texture is uploaded once per rig, not once per card.
 * The runtime itself is loaded lazily, the first time a rig comes on screen.
 */
type Spine = typeof import('@esotericsoftware/spine-webgl')
type SkeletonData = import('@esotericsoftware/spine-webgl').SkeletonData

// Rigs are authored in a 470×470 frame centred on the origin; the stage renders at 512 px and
// cards scale that down to their own size.
const FRAME = 470
const SIZE = 512

interface Player {
  ctx: CanvasRenderingContext2D
  skeleton: import('@esotericsoftware/spine-webgl').Skeleton
  state: import('@esotericsoftware/spine-webgl').AnimationState
  onFirstFrame?: () => void
}

let stage: Promise<{
  spine: Spine
  gl: WebGLRenderingContext
  canvas: HTMLCanvasElement
  renderer: import('@esotericsoftware/spine-webgl').SceneRenderer
  assets: import('@esotericsoftware/spine-webgl').AssetManager
}> | null = null
const rigs = new Map<string, Promise<SkeletonData>>()
const players = new Set<Player>()
let raf = 0
let last = 0

function boot() {
  stage ??= import('@esotericsoftware/spine-webgl').then((spine) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    const context = new spine.ManagedWebGLRenderingContext(canvas, { alpha: true, premultipliedAlpha: false, antialias: true })
    const renderer = new spine.SceneRenderer(canvas, context)
    renderer.camera.setViewport(FRAME, FRAME)
    renderer.camera.position.set(0, 0, 0)
    return { spine, gl: context.gl, canvas, renderer, assets: new spine.AssetManager(context) }
  })
  return stage
}

function loadRig(rig: CaseRig) {
  const key = `${rig.skeleton}|${rig.atlas}`
  let data = rigs.get(key)
  if (!data) {
    data = boot().then(async ({ spine, assets }) => {
      const [json, atlas] = await Promise.all([assets.loadJsonAsync(rig.skeleton), assets.loadTextureAtlasAsync(rig.atlas)])
      return new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas as InstanceType<Spine['TextureAtlas']>)).readSkeletonData(json)
    })
    // A failed load stays failed for this page; the cards keep their WebP.
    rigs.set(key, data)
  }
  return data
}

async function frame(now: number) {
  raf = players.size ? requestAnimationFrame(frame) : 0
  if (!stage || !players.size) return
  const { spine, gl, renderer } = await stage
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
  last = now
  for (const p of players) {
    p.state.update(dt)
    p.state.apply(p.skeleton)
    p.skeleton.updateWorldTransform(spine.Physics.update)
    gl.viewport(0, 0, SIZE, SIZE)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    renderer.begin()
    renderer.drawSkeleton(p.skeleton, false)
    renderer.end()
    const c = p.ctx.canvas
    p.ctx.clearRect(0, 0, c.width, c.height)
    p.ctx.drawImage(renderer.canvas, 0, 0, SIZE, SIZE, 0, 0, c.width, c.height)
    p.onFirstFrame?.()
    p.onFirstFrame = undefined
  }
}

/**
 * Plays `rig` onto `canvas` until the returned stop function is called. `onFirstFrame` fires once the
 * first frame is on the canvas (swap the static art out then); a rig that fails to load never fires it.
 */
export function playRig(canvas: HTMLCanvasElement, rig: CaseRig, onFirstFrame?: () => void) {
  let player: Player | null = null
  let stopped = false
  loadRig(rig)
    .then(async (data) => {
      if (stopped) return
      const { spine } = await boot()
      const skeleton = new spine.Skeleton(data)
      const state = new spine.AnimationState(new spine.AnimationStateData(data))
      const entry = state.setAnimation(0, rig.animation ?? 'idle', true)
      // Start each card somewhere else in the loop, so several copies never move in lockstep
      entry.trackTime = Math.random() * entry.animationEnd
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      player = { ctx, skeleton, state, onFirstFrame }
      players.add(player)
      if (!raf) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    })
    .catch(() => {})
  return () => {
    stopped = true
    if (player) players.delete(player)
  }
}
