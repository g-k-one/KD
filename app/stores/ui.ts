import { defineStore } from 'pinia'

type Popover = 'settings' | 'profile' | null

export const useUiStore = defineStore('ui', () => {
  const popover = ref<Popover>(null)
  const mobileMenuOpen = ref(false)
  const signInOpen = ref(false)

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

  return { popover, mobileMenuOpen, signInOpen, togglePopover, closeAll, openSignIn }
})
