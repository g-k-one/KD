/*
 * Forge (Горн): our WebGL particle engine, vendored in public/vendor/forge (see docs/motion.md → VFX).
 * Loaded lazily on the client the first time an effect is asked for; nothing runs while no effect is live.
 *
 *   const fx = useForge()            // shared full-screen layer (above everything): one-shot big moments
 *   const fx = useForge(hostRef)     // own canvas inside hostRef: stays under sticky headers, clipped to it
 *   fx.play('coins', { el })         // follow an element: centred on it, sized to its width, clipped to it
 *   fx.at('shock', el, 1.6)          // one-shot centred on an element, 1.6× its width, not clipped
 *
 * Effects are authored in a 360×360 square. Reduced motion → every call is a no-op.
 */
export interface ForgeHandle {
  stop(): void
  kill(): void
  alive(): boolean
  /** Sets a field on the effect's state, e.g. set('tint', [r, g, b]) for kdAura */
  set(k: string, v: unknown): void
}
/** play options: position and size, follow an element, loop; effect settings (rarity colour and level, a coin image …) */
export interface ForgeOptions {
  x?: number
  y?: number
  size?: number
  loop?: boolean
  el?: HTMLElement
  [k: string]: unknown
}
interface ForgeEngine {
  names: string[]
  define: (name: string, build: (h: never) => unknown) => void
  base: string
  play(name: string, o?: ForgeOptions): ForgeHandle | null
  stopAll(): void
  preload(atlas: string): void
  /** vendored patch: frees a section canvas and its GL context */
  destroy?(): void
}
declare global {
  interface Window {
    Forge?: ForgeEngine
    makeForge?: (host: HTMLElement | null) => ForgeEngine
  }
}

let loading: Promise<boolean> | null = null
function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Forge: ${src}`))
    document.head.appendChild(s)
  })
}
function baseUrl() {
  const b = useRuntimeConfig().app.baseURL || '/'
  return `${b.endsWith('/') ? b : `${b}/`}vendor/forge/`
}
/** Forge packs we ship (from the Pawn repo: `npm run forge` → dist-forge, *.min.js copied here without .min):
 *  image — image modes the others build on · hits — sharp shapes (rays, rings) · matter — 3D coins and feathers,
 *  gold burst (goldboom, feathers) · rarity — rarity beam under a drop (lootbeam), rarity frame / reveal, appear / vanish */
const PACKS = ['image', 'hits', 'matter', 'rarity']
/** Loads the engine (with its atlas map), our own atlas, then the packs — once, in order (classic scripts sharing globals). */
function ensureForge(base: string) {
  loading ??= loadScript(`${base}forge.js`)
    // our own atlas (KD coin, feather, glow masks), see scripts/build-forge-atlas.mjs — adds FX_ATLAS.kd, so after the engine
    .then(() => loadScript(`${base}kd-atlas.js`))
    .then(() => PACKS.reduce((p, n) => p.then(() => loadScript(`${base}forge-${n}.js`)), Promise.resolve()))
    .then(() => {
      if (!window.Forge) return false
      window.Forge.base = base
      defineKdEffects(window.Forge as never)
      return true
    })
    .catch(() => false)
  return loading
}

export function useForge(host?: Ref<HTMLElement | null | undefined>) {
  const base = import.meta.client ? baseUrl() : ''
  const reduced = import.meta.client ? useMediaQuery('(prefers-reduced-motion: reduce)') : ref(false)
  // One engine per layer, even when many effects ask for it at once while the script loads
  let engine: Promise<ForgeEngine | null> | null = null
  const live = new Set<ForgeHandle>()

  async function create() {
    if (!(await ensureForge(base))) return null
    if (!host) return window.Forge ?? null
    if (!host.value || !window.makeForge) return null
    const e = window.makeForge(host.value)
    e.base = base
    // Effects live per engine: every section canvas gets KurwaDROP's own set too
    defineKdEffects(e as never)
    return e
  }
  async function get() {
    if (!import.meta.client || reduced.value) return null
    engine ??= create()
    const e = await engine
    // The host was not mounted yet: try again next time
    if (!e) engine = null
    return e
  }

  async function play(name: string, o: ForgeOptions = {}) {
    const e = await get()
    const h = e?.play(name, o) ?? null
    if (h) live.add(h)
    return h
  }

  /** One-shot centred on an element (viewport coordinates, or relative to the host). */
  function at(name: string, el: HTMLElement | null | undefined, scale = 1, loop = false, opts: ForgeOptions = {}) {
    if (!el) return Promise.resolve(null)
    const r = el.getBoundingClientRect()
    const hr = host?.value?.getBoundingClientRect()
    return play(name, { ...opts, x: r.left + r.width / 2 - (hr?.left ?? 0), y: r.top + r.height / 2 - (hr?.top ?? 0), size: Math.max(r.width, r.height) * scale, loop })
  }

  function stopAll() {
    live.forEach((h) => h.stop())
    live.clear()
  }

  // Loops die with the component that started them; a section canvas (host) is freed with its GL context —
  // without this every visit to a page with a reel, the feed or the dial left a WebGL context behind
  if (getCurrentInstance())
    onBeforeUnmount(() => {
      stopAll()
      if (!host || !engine) return
      const e = engine
      engine = null
      e.then((x) => x?.destroy?.())
    })

  return { play, at, stopAll, preload: async (atlas: string) => (await get())?.preload(atlas) }
}

export type ForgeLayer = ReturnType<typeof useForge>
export const FORGE_KEY = Symbol('kd-forge') as InjectionKey<ForgeLayer>

/**
 * Gives a section its own Forge canvas: effects started by children (FxFire) draw inside it,
 * under the sticky header. The canvas is raised to z-index 1, so content that should sit in front
 * of the effect (badge text) takes z-index 2.
 */
export function provideForge(host: Ref<HTMLElement | null | undefined>) {
  const layer = useForge(host)
  provide(FORGE_KEY, layer)
  onMounted(() => {
    // makeForge appends its canvas on first use; lift it above the cards once it exists
    const lift = new MutationObserver(() => {
      const cv = host.value?.querySelector<HTMLCanvasElement>(':scope > canvas.fx-cv')
      if (cv) {
        cv.style.zIndex = '1'
        lift.disconnect()
      }
    })
    if (host.value) lift.observe(host.value, { childList: true })
    onBeforeUnmount(() => lift.disconnect())
  })
  return layer
}
