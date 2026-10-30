// Cookie consent (GDPR / ePrivacy): strictly necessary cookies (sign-in, balance, settings) need no consent and are
// always on; analytics and marketing stay off until the player turns them on. Nothing is pre-ticked, rejecting takes
// one tap like accepting, and the choice can be changed at any time (footer · Cookie settings). The analytics and
// ads scripts read `allowed` before they load.
export type ConsentCategory = 'analytics' | 'marketing'

export function useConsent() {
  const store = usePersisted('kd_consent', { v: 1, decided: false, analytics: false, marketing: false })
  // the banner reopened from the footer, straight on its settings
  const editing = useState('kd-consent-editing', () => false)
  const open = computed(() => !store.value.decided || editing.value)

  function decide(choice: Record<ConsentCategory, boolean>) {
    store.value = { v: 1, decided: true, ...choice }
    editing.value = false
  }
  return {
    open,
    editing,
    allowed: (c: ConsentCategory) => store.value.decided && store.value[c],
    current: computed(() => ({ analytics: store.value.analytics, marketing: store.value.marketing })),
    acceptAll: () => decide({ analytics: true, marketing: true }),
    rejectAll: () => decide({ analytics: false, marketing: false }),
    save: (choice: Record<ConsentCategory, boolean>) => decide(choice),
    reopen: () => (editing.value = true),
    /** back to a first visit: no choice made, the banner up (debug) */
    reset: () => {
      store.value = { v: 1, decided: false, analytics: false, marketing: false }
      editing.value = false
    },
  }
}
