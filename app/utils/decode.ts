// Decodes an image once per URL and keeps the promise, so reels can wait for their art before moving.
const cache = new Map<string, Promise<void>>()

export function decodeImage(src: string): Promise<void> {
  if (!import.meta.client || !src) return Promise.resolve()
  let p = cache.get(src)
  if (!p) {
    const img = new Image()
    img.src = src
    p = img.decode().catch(() => {})
    cache.set(src, p)
  }
  return p
}
