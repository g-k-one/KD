// Static artifact build only: route /api/* calls to the in-browser mock instead of the network.
export default defineNuxtPlugin({
  name: 'client-mock',
  enforce: 'pre',
  async setup() {
    if (!useRuntimeConfig().public.clientMock) return

    const { handleMockRequest } = await import('~/mock/client-api')
    const original = globalThis.$fetch

    const patched = ((request: unknown, options?: { method?: string; body?: unknown; query?: Record<string, unknown> }) => {
      const url = typeof request === 'string' ? request : (request as Request)?.url
      if (url?.startsWith('/api/')) return handleMockRequest(url, options)
      return original(request as string, options as never)
      // through unknown: comparing against $fetch's route-typed signature runs too deep for TypeScript
    }) as unknown as typeof $fetch
    patched.raw = original.raw
    patched.create = original.create

    globalThis.$fetch = patched
  },
})
