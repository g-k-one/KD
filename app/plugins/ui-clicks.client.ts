// Every press in the interface answers with a click (useSfx): a soft tick for buttons, links, tabs and menu items, a
// fuller press for the main coloured buttons. Elements with a sound of their own (a skin tile, the banner chicken, the
// Provably Fair lens) sit inside data-sfx="own" and stay out of it; disabled ones are silent.
const PRESSABLE = 'button, a[href], [role="button"], [role="tab"], [role="radio"], [role="option"], [role="switch"], [role="menuitem"], summary'
const MAIN = '.kd-btn-primary, .kd-btn-fair, .kd-btn-gold, .kd-btn-success, .kd-btn-danger'

export default defineNuxtPlugin(() => {
  const sfx = useSfx()
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest?.(PRESSABLE)
      if (!el || el.closest('[data-sfx="own"]')) return
      if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return
      if (el.matches(MAIN)) sfx.press()
      else sfx.tap()
    },
    true,
  )
})
