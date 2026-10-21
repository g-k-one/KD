/**
 * Resolves when a Web Animation finishes, or after its duration plus a margin.
 * Background tabs pause animation timelines; the timeout keeps game state moving
 * so a spin never hangs waiting for a tab that isn't visible.
 */
export function animationDone(anim: Animation, duration: number) {
  return Promise.race([anim.finished.catch(() => undefined), new Promise((r) => setTimeout(r, duration + 250))])
}
