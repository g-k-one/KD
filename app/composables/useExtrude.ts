/*
 * Extrude (Объём): pseudo-3D text from stacked copies with gradients, bevel, metal and glow, vendored in
 * public/vendor/extrude (source of truth: pawn → src/app/16l-extrude.js). One WebGL canvas per label;
 * it draws only while something moves, the heavy glyph prep runs in a Web Worker.
 *
 *   const ex = useExtrude()
 *   const t = await ex.mount(el, { text: 'KURWA!', face: [...], side: [...] })   // null: no WebGL / reduced motion
 *   t.play('pop'); t.count(7, { format: (v) => stages[Math.round(v)] }); t.shine(); t.destroy()
 *
 * Reduced motion → mount resolves to null and callers show their plain fallback.
 */
export interface ExtrudeHandle {
  set(o: Record<string, unknown>): void
  rotate(yaw: number, pitch?: number, kick?: boolean): void
  play(name: 'drop' | 'pop' | 'slam' | 'wave' | 'out', o?: Record<string, unknown>): Promise<void>
  count(to: number, o?: Record<string, unknown>): Promise<void>
  shine(): void
  stop(): void
  destroy(): void
  readonly ready: Promise<void>
  readonly text: string
}
interface ExtrudeEngine {
  mount(el: HTMLElement, o?: Record<string, unknown>): ExtrudeHandle
  defaults: Record<string, unknown>
}
declare global {
  interface Window {
    Extrude?: ExtrudeEngine
  }
}

let loading: Promise<ExtrudeEngine | null> | null = null
function load(): Promise<ExtrudeEngine | null> {
  const b = useRuntimeConfig().app.baseURL || '/'
  loading ??= new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = `${b.endsWith('/') ? b : `${b}/`}vendor/extrude/extrude.js`
    s.onload = () => resolve(window.Extrude ?? null)
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
  return loading
}

export function useExtrude() {
  const reduced = import.meta.client ? useMediaQuery('(prefers-reduced-motion: reduce)') : ref(false)
  return {
    /** Loads the engine once and mounts a label into el (its own canvas, sized to el). */
    async mount(el: HTMLElement, o: Record<string, unknown> = {}): Promise<ExtrudeHandle | null> {
      if (!import.meta.client || reduced.value) return null
      const e = await load()
      if (!e || !el.isConnected) return null
      try {
        const t = e.mount(el, o)
        // without WebGL the engine leaves plain text and a stub without animations: treat it as unavailable
        if (typeof t.play !== 'function') {
          t.destroy()
          return null
        }
        return t
      } catch {
        return null
      }
    },
    /** Warm the script while the page is idle, so the first label does not wait for the network */
    preload: () => (import.meta.client && !reduced.value ? load() : Promise.resolve(null)),
  }
}
