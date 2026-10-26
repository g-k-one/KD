type Popover = 'settings' | 'profile' | null

// what is open: popovers, the phone menu, the sign-in / deposit modals, the inventory drawer
export const useUiStore = sharedStore('ui', () => {
  const popover = useState<Popover>('kd-ui-popover', () => null)
  const mobileMenuOpen = useState('kd-ui-menu', () => false)
  const signInOpen = useState('kd-ui-signin', () => false)
  /** Quick top-up modal; need = missing coin cents, pre-filled as the amount */
  const depositOpen = useState('kd-ui-deposit', () => false)
  const depositNeed = useState<number | null>('kd-ui-deposit-need', () => null)
  /** Inventory drawer, from the balance chip */
  const inventoryOpen = useState('kd-ui-inventory', () => false)

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

  function openInventory() {
    closeAll()
    inventoryOpen.value = true
  }

  return { popover, mobileMenuOpen, signInOpen, depositOpen, depositNeed, inventoryOpen, togglePopover, closeAll, openSignIn, openDeposit, openInventory }
})
