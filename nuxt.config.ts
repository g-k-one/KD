import tailwindcss from '@tailwindcss/vite'

// KD_ARTIFACT=1 → static SPA for the claude.ai artifact: no server, hash routes,
// relative asset paths, in-browser mock API (app/plugins/00.client-mock.client.ts).
const artifact = !!process.env.KD_ARTIFACT

export default defineNuxtConfig({
  ...(artifact && {
    ssr: false,
    router: { options: { hashMode: true } },
    experimental: { appManifest: false },
    nitro: { preset: 'static' },
  }),

  runtimeConfig: {
    // debug: the 🐞 dock and /debug, /fx tools. On for the prototype; NUXT_PUBLIC_DEBUG=false hides them.
    public: { clientMock: artifact, debug: true },
  },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/i18n', '@nuxt/fonts', '@nuxt/image'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
    // The artifact host caps a version at 511 files: one stylesheet instead of one per component
    ...(artifact && { build: { cssCodeSplit: false } }),
    // and small client JS chunks merged into their neighbours (the skin pictures alone take ~360 of the files)
    ...(artifact && { $client: { build: { rollupOptions: { output: { experimentalMinChunkSize: 120_000 } } } } }),
  },

  app: {
    // "_nuxt" is a reserved name on the artifact host
    ...(artifact && { buildAssetsDir: '/assets/' }),
    head: {
      title: 'KurwaDROP',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0c0d10' },
      ],
    },
  },

  fonts: {
    families: [{ name: 'Rubik', provider: 'google', weights: [400, 500, 600, 700, 800] }],
  },

  // All UI copy lives in i18n/locales/*.json. Add Polish by dropping pl.json and a locale entry here.
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [{ code: 'en', language: 'en-US', name: 'English', file: 'en.json' }],
    detectBrowserLanguage: false,
  },
})
