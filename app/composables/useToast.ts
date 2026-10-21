export interface Toast {
  id: number
  text: string
  tone: 'default' | 'success' | 'danger'
}

let seq = 0

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function show(text: string, tone: Toast['tone'] = 'default', ms = 3200) {
    const id = ++seq
    toasts.value = [...toasts.value, { id, text, tone }]
    setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), ms)
  }

  /** Shows the message from an API error (mock and real backend use the same shape). */
  function error(e: unknown, fallback: string) {
    const err = e as { data?: { message?: string }; statusMessage?: string }
    show(err?.data?.message ?? err?.statusMessage ?? fallback, 'danger')
  }

  return { toasts, show, error }
}
