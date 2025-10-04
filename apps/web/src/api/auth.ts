import { apiClient, setAuthToken } from './client'
import type { User, WorkspaceSummary } from '../types'

export const loginRequest = async (payload: { email: string; password: string; workspaceId?: string }) => {
  const response = await apiClient.post('/auth/login', payload)
  const { token, user, workspaceId, workspaces } = response.data as {
    token: string
    user: User
    workspaceId: string
    workspaces?: WorkspaceSummary[]
  }
  setAuthToken(token)
  return { token, user, workspaceId, workspaces: workspaces ?? [] }
}

export const registerRequest = async (payload: {
  email: string
  password: string
  name: string
  inviteCode?: string
}) => {
  const response = await apiClient.post('/auth/register', payload)
  const { token, user, workspace } = response.data
  setAuthToken(token)
  return { token, user: user as User, workspaceId: workspace.id }
}

export const fetchCurrentUser = async (token: string) => {
  setAuthToken(token)
  const response = await apiClient.get('/auth/me')
  return response.data as { user: User; workspaceId: string; workspaces: WorkspaceSummary[] }
}

export const fetchAuthFeatures = async () => {
  const response = await apiClient.get('/auth/features')
  return response.data as { features: { disableSignup: boolean } }
}

export const switchWorkspaceRequest = async (workspaceId: string) => {
  const response = await apiClient.post('/auth/switch', { workspaceId })
  const { token } = response.data as { token: string; workspaceId: string }
  setAuthToken(token)
  return response.data as { token: string; workspaceId: string }
}
