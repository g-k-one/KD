import { provideSSRWidth } from '@vueuse/core'

// Media queries (useMediaQuery) answer as a phone on the server and through hydration, so the first client render is
// the server's one (mobile-first: most players are on phones) and nothing mismatches; once hydrated they read the
// real screen. Pages opened later, and the SPA artifact, never see this width.
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.server && !nuxtApp.isHydrating) return
  provideSSRWidth(390, nuxtApp.vueApp)
  if (import.meta.client) nuxtApp.hook('app:suspense:resolve', () => provideSSRWidth(null, nuxtApp.vueApp))
})
