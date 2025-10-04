import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loginRequest, fetchCurrentUser, switchWorkspaceRequest } from '../api/auth'
import { setAuthToken } from '../api/client'
import { fetchWorkspaces } from '../api/workspaces'
import type { User, WorkspaceSummary } from '../types'

interface AuthState {
  token: string | null
  user: User | null
  workspaceId: string | null
  workspaces: WorkspaceSummary[]
  loading: boolean
  error: string | null
  login: (input: { email: string; password: string; workspaceId?: string }) => Promise<void>
  logout: () => void
  loadSession: () => Promise<void>
  refreshWorkspaces: () => Promise<void>
  switchWorkspace: (workspaceId: string) => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      workspaceId: null,
      workspaces: [],
      loading: false,
      error: null,
      login: async credentials => {
        set({ loading: true, error: null })
        try {
          const { token, user, workspaceId, workspaces } = await loginRequest(credentials)
          setAuthToken(token)
          set({ token, user, workspaceId, workspaces, loading: false })
        } catch (error) {
          set({ error: 'Unable to login', loading: false })
          throw error
        }
      },
      logout: () => {
        setAuthToken(null)
        set({
          token: null,
          user: null,
          workspaceId: null,
          workspaces: [],
          error: null,
          loading: false
        })
      },
      loadSession: async () => {
        const { token } = get()
        if (!token) return
        try {
          const { user, workspaceId, workspaces } = await fetchCurrentUser(token)
          setAuthToken(token)
          set({ user, workspaceId, workspaces })
        } catch (error) {
          setAuthToken(null)
          set({ token: null, user: null, workspaceId: null, workspaces: [] })
        }
      },
      refreshWorkspaces: async () => {
        const { token } = get()
        if (!token) return
        const workspaces = await fetchWorkspaces()
        set({ workspaces })
      },
      switchWorkspace: async (workspaceId: string) => {
        const { token } = await switchWorkspaceRequest(workspaceId)
        set({ token, workspaceId })
        await get().loadSession()
      }
    }),
    {
      name: 'p42-auth'
    }
  )
)
