/**
 * Resolves when a Web Animation finishes, or after its duration plus a margin.
 * Background tabs pause animation timelines; the timeout keeps game state moving
 * so a spin never hangs waiting for a tab that isn't visible.
 */
export function animationDone(anim: Animation, duration: number) {
  return Promise.race([anim.finished.catch(() => undefined), new Promise((r) => setTimeout(r, duration + 250))])
}

/** The motion tokens for scripts: element.animate() takes no var(), so these repeat main.css word for word */
export const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const EASE_IN = 'cubic-bezier(0.55, 0, 1, 0.45)'
export const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'
export const EASE_SINE = 'cubic-bezier(0.45, 0, 0.55, 1)'
