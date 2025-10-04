import { apiClient } from './client'
import type {
  WorkspaceSummary,
  WorkspaceDetail,
  WorkspaceMemberSummary,
  WorkspaceRole,
  SubscriptionPlan
} from '../types'

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
  return response.data.workspace as WorkspaceDetail
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

export const fetchWorkspacePlans = async () => {
  const response = await apiClient.get('/workspaces/plans')
  return response.data.plans as SubscriptionPlan[]
}

export const selectWorkspacePlanRequest = async (workspaceId: string, payload: { planId: string }) => {
  const response = await apiClient.patch(`/workspaces/${workspaceId}/plan`, payload)
  return response.data.workspace as WorkspaceDetail
}

export const fetchWorkspaceDomains = async (workspaceId: string) => {
  const response = await apiClient.get(`/workspaces/${workspaceId}/domains`)
  return response.data.domains as Array<{ id: string; domain: string; status: string }>
}

export const deleteWorkspaceRequest = async (
  workspaceId: string,
  payload?: { strategy?: 'transfer' | 'purge'; targetWorkspaceId?: string }
) => {
  const response = await apiClient.delete(`/workspaces/${workspaceId}`, {
    data: payload
  })
  return response.data as {
    status: 'purged' | 'transferred'
    workspaceId: string
    targetWorkspaceId?: string
  }
}
