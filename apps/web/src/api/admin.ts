import { apiClient } from './client'
import type {
  AdminStats,
  AdminWorkspaceSummary,
  SignupInviteSummary,
  AdminUserSummary,
  AnalyticsAggregation
} from '../types'

export const fetchAdminStats = async () => {
  const response = await apiClient.get('/admin/stats')
  return response.data as AdminStats
}

export const fetchAdminWorkspaces = async () => {
  const response = await apiClient.get('/admin/workspaces')
  return response.data as { workspaces: AdminWorkspaceSummary[] }
}

export const updateAdminWorkspace = async (
  id: string,
  payload: { plan?: 'free' | 'pro' | 'enterprise'; planLimits?: { links?: number; qrCodes?: number; members?: number } }
) => {
  const response = await apiClient.patch(`/admin/workspaces/${id}`, payload)
  return response.data as { workspace: AdminWorkspaceSummary }
}

export const fetchAdminInvites = async () => {
  const response = await apiClient.get('/admin/invites')
  return response.data as { invites: SignupInviteSummary[] }
}

export const createAdminInvite = async (payload: { code?: string }) => {
  const response = await apiClient.post('/admin/invites', payload)
  return response.data as { invite: SignupInviteSummary }
}

export const fetchAdminUsers = async () => {
  const response = await apiClient.get('/admin/users')
  return response.data as { users: AdminUserSummary[] }
}

export const fetchAdminAnalytics = async (params: {
  period: string
  workspaceId?: string
  userId?: string
  filters?: string
  page?: number
  pageSize?: number
}) => {
  const response = await apiClient.get('/admin/analytics', {
    params: {
      period: params.period,
      ...(params.workspaceId ? { workspaceId: params.workspaceId } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.filters ? { filters: params.filters } : {}),
      ...(typeof params.page === 'number' ? { page: params.page } : {}),
      ...(typeof params.pageSize === 'number' ? { pageSize: params.pageSize } : {})
    }
  })
  const data = response.data as { analytics: AnalyticsAggregation }
  return data.analytics
}
