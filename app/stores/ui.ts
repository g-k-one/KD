import { defineStore } from 'pinia'

type Popover = 'settings' | 'profile' | null

export const useUiStore = defineStore('ui', () => {
  const popover = ref<Popover>(null)
  const mobileMenuOpen = ref(false)
  const signInOpen = ref(false)
  /** Quick top-up modal; need = missing coin cents, pre-filled as the amount */
  const depositOpen = ref(false)
  const depositNeed = ref<number | null>(null)

  function togglePopover(p: Exclude<Popover, null>) {
    popover.value = popover.value === p ? null : p
  }

  function closeAll() {
    popover.value = null
    mobileMenuOpen.value = false
  }

  function openSignIn() {
    closeAll()
    signInOpen.value = true
  }

  function openDeposit(need?: number) {
    closeAll()
    depositNeed.value = need && need > 0 ? need : null
    depositOpen.value = true
  }

  return { popover, mobileMenuOpen, signInOpen, depositOpen, depositNeed, togglePopover, closeAll, openSignIn, openDeposit }
})
