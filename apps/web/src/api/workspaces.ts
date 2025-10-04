import { apiClient } from './client'
import type { WorkspaceSummary, WorkspaceMemberSummary, WorkspaceRole } from '../types'

export const fetchWorkspaces = async () => {
  const response = await apiClient.get('/workspaces')
  return response.data.workspaces as WorkspaceSummary[]
}

export const createWorkspaceRequest = async (payload: { name: string }) => {
  const response = await apiClient.post('/workspaces', payload)
  return response.data.workspace as WorkspaceSummary
}

export const fetchWorkspaceDetail = async (workspaceId: string) => {
  const response = await apiClient.get(`/workspaces/${workspaceId}`)
  return response.data.workspace as WorkspaceSummary
}

export const fetchWorkspaceMembers = async (workspaceId: string) => {
  const response = await apiClient.get(`/workspaces/${workspaceId}/members`)
  return response.data.members as WorkspaceMemberSummary[]
}

export const inviteWorkspaceMemberRequest = async (
  workspaceId: string,
  payload: { email: string; role: WorkspaceRole }
) => {
  const response = await apiClient.post(`/workspaces/${workspaceId}/members`, payload)
  return response.data.member as WorkspaceMemberSummary
}

export const updateWorkspaceRequest = async (workspaceId: string, payload: { name: string }) => {
  const response = await apiClient.patch(`/workspaces/${workspaceId}`, payload)
  return response.data.workspace as WorkspaceSummary
}

export const fetchWorkspaceDomains = async (workspaceId: string) => {
  const response = await apiClient.get(`/workspaces/${workspaceId}/domains`)
  return response.data.domains as Array<{ id: string; domain: string; status: string }>
}
