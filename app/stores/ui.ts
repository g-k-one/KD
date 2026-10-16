import { defineStore } from 'pinia'

type Popover = 'settings' | 'profile' | null

export const useUiStore = defineStore('ui', () => {
  const popover = ref<Popover>(null)
  const mobileMenuOpen = ref(false)

  function togglePopover(p: Exclude<Popover, null>) {
    popover.value = popover.value === p ? null : p
  }

  function closeAll() {
    popover.value = null
    mobileMenuOpen.value = false
  }

  return { popover, mobileMenuOpen, togglePopover, closeAll }
})
