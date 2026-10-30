// The CSS's screen steps for scripts, so a script and the classes beside it always switch at the same width
export const useIsSm = () => useMediaQuery('(min-width: 640px)')
export const useIsMd = () => useMediaQuery('(min-width: 768px)')
export const useIsLg = () => useMediaQuery('(min-width: 1024px)')
