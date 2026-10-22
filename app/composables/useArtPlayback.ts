import type { MaybeElementRef } from '@vueuse/core'

/*
 * Animated case art is decoded on the CPU frame by frame, so only a few may play at once.
 * Each card asks for a slot while it is on screen; slots go to cards in the order they came into
 * view, and a card that scrolls away hands its slot to the next one waiting. Fewer slots on touch
 * devices (weaker CPUs), none at all with reduced motion.
 */
const MAX_PLAYING = { fine: 4, coarse: 2 }

interface Entry { playing: Ref<boolean> }
const waiting: Entry[] = []
const active = new Set<Entry>()

function limit() {
  if (import.meta.server) return 0
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0
  return matchMedia('(pointer: fine)').matches ? MAX_PLAYING.fine : MAX_PLAYING.coarse
}

function fill() {
  const max = limit()
  while (active.size < max && waiting.length) {
    const e = waiting.shift()!
    active.add(e)
    e.playing.value = true
  }
}

function leave(e: Entry) {
  const i = waiting.indexOf(e)
  if (i >= 0) waiting.splice(i, 1)
  if (active.delete(e)) {
    e.playing.value = false
    fill()
  }
}

/** True while this element may play its animation: it is at least half on screen and holds a slot. */
export function useArtPlayback(el: MaybeElementRef, enabled: MaybeRefOrGetter<boolean>) {
  const entry: Entry = { playing: ref(false) }

  useIntersectionObserver(
    el,
    ([e]) => {
      if (e?.isIntersecting && toValue(enabled)) {
        if (!active.has(entry) && !waiting.includes(entry)) waiting.push(entry)
        fill()
      } else {
        leave(entry)
      }
    },
    { threshold: 0.5 },
  )
  watch(() => toValue(enabled), (v) => !v && leave(entry))
  onBeforeUnmount(() => leave(entry))

  return readonly(entry.playing)
}
