import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loginRequest, fetchCurrentUser } from '../api/auth'
import { setAuthToken } from '../api/client'
import type { User } from '../types'

interface AuthState {
  token: string | null
  user: User | null
  workspaceId: string | null
  loading: boolean
  error: string | null
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => void
  loadSession: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      workspaceId: null,
      loading: false,
      error: null,
      login: async credentials => {
        set({ loading: true, error: null })
        try {
          const { token, user, workspaceId } = await loginRequest(credentials)
          setAuthToken(token)
          set({ token, user, workspaceId, loading: false })
        } catch (error) {
          set({ error: 'Unable to login', loading: false })
          throw error
        }
      },
      logout: () => {
        setAuthToken(null)
        set({ token: null, user: null, workspaceId: null, error: null, loading: false })
      },
      loadSession: async () => {
        const { token } = get()
        if (!token) return
        try {
          const { user, workspaceId } = await fetchCurrentUser(token)
          setAuthToken(token)
          set({ user, workspaceId })
        } catch (error) {
          setAuthToken(null)
          set({ token: null, user: null, workspaceId: null })
        }
      }
    }),
    {
      name: 'p42-auth'
    }
  )
)
