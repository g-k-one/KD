import { defineStore } from 'pinia'
import type { MeResponse, User } from '#shared/types/api'

export const useSessionStore = defineStore('session', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => !!user.value)

  async function fetchMe() {
    // useRequestFetch forwards the browser cookie during SSR
    const res = await useRequestFetch()<MeResponse>('/api/me')
    user.value = res.user
  }

  /** Re-reads the user after a game (level, progress) without replacing the object the header animates. */
  async function refresh() {
    if (!user.value) return
    try {
      const res = await $fetch<MeResponse>('/api/me')
      if (res.user && user.value) Object.assign(user.value, res.user)
    } catch {
      // keep what we have
    }
  }

  async function login() {
    const res = await $fetch<MeResponse>('/api/auth/login', { method: 'POST' })
    user.value = res.user
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, isLoggedIn, fetchMe, refresh, login, logout }
})
