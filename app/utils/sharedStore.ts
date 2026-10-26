import type { UnwrapNestedRefs } from 'vue'

/**
 * A store without Pinia: `setup` runs once per app (per request on the server), in its own effect scope so its
 * watchers and computeds outlive the component that first asked for it; the result comes back as one reactive
 * object, so `session.user`, `ui.signInOpen = true` read and write as before. State that must reach the browser
 * from the server render goes through useState inside `setup`.
 */
export function sharedStore<T extends object>(id: string, setup: () => T): () => UnwrapNestedRefs<T> {
  return () => {
    const nuxt = useNuxtApp() as ReturnType<typeof useNuxtApp> & { _kdStores?: Record<string, unknown> }
    const stores = (nuxt._kdStores ??= {})
    if (!stores[id]) {
      // called from a setup or a plugin, so the Nuxt context is there for useState (runWithContext would hand back a
      // promise on the server)
      const scope = effectScope(true)
      stores[id] = scope.run(() => reactive(setup()))
      // a server render's stores end with the request
      if (import.meta.server) nuxt.hook('app:rendered', () => scope.stop())
    }
    return stores[id] as UnwrapNestedRefs<T>
  }
}
