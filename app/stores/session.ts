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

  async function login() {
    const res = await $fetch<MeResponse>('/api/auth/login', { method: 'POST' })
    user.value = res.user
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, isLoggedIn, fetchMe, login, logout }
})
