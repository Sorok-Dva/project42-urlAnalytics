import { apiClient, setAuthToken } from './client'
import type { User } from '../types'

export const loginRequest = async (payload: { email: string; password: string }) => {
  const response = await apiClient.post('/auth/login', { ...payload })
  const { token, user, workspaceId } = response.data
  setAuthToken(token)
  return { token, user: user as User, workspaceId }
}

export const registerRequest = async (payload: { email: string; password: string; name: string }) => {
  const response = await apiClient.post('/auth/register', payload)
  const { token, user, workspace } = response.data
  setAuthToken(token)
  return { token, user: user as User, workspaceId: workspace.id }
}

export const fetchCurrentUser = async (token: string) => {
  setAuthToken(token)
  const response = await apiClient.get('/auth/me')
  return response.data as { user: User; workspaceId: string }
}
