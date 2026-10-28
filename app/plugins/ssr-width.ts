import { provideSSRWidth } from '@vueuse/core'

// Media queries (useMediaQuery) answer as a phone on the server and through hydration, so the first client render is
// the server's one (mobile-first: most players are on phones) and nothing mismatches; once hydrated they read the
// real screen. Pages opened later, and the SPA artifact, never see this width.
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.server && !nuxtApp.isHydrating) return
  provideSSRWidth(390, nuxtApp.vueApp)
  // after hydration: clear the provided width in place (a second provideSSRWidth would make Vue warn on every page)
  if (import.meta.client) {
    nuxtApp.hook('app:suspense:resolve', () => {
      const provides = nuxtApp.vueApp._context.provides as Record<symbol, unknown>
      const key = Object.getOwnPropertySymbols(provides).find((s) => s.description === 'vueuse-ssr-width')
      if (key) provides[key] = null
    })
  }
})
