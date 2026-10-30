import type { RouterConfig } from 'nuxt/schema'

// Nuxt's own scrolling waits one frame after the new page is in, which showed that page at the old page's scroll
// before it jumped: here the scroll lands in the same frame as the swap
export default <RouterConfig>{
  scrollBehavior(to, from, saved) {
    if (to.path === from.path) return false
    const nuxtApp = useNuxtApp()
    return new Promise((resolve) => {
      nuxtApp.hooks.hookOnce('page:loading:end', () => resolve(saved ?? { left: 0, top: 0 }))
    })
  },
}
