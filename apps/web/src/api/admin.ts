import { apiClient } from './client'
import type {
  AdminStats,
  AdminWorkspaceSummary,
  SignupInviteSummary,
  AdminUserSummary,
  AnalyticsAggregation,
  SubscriptionPlan,
  LinkAddon,
  AppSettingsMap
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
  payload: { planId?: string | null; planLimits?: { links?: number; qrCodes?: number; members?: number; workspaces?: number } }
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

export const fetchSubscriptionPlans = async () => {
  const response = await apiClient.get('/admin/subscription-plans')
  return response.data as { plans: SubscriptionPlan[] }
}

export const createSubscriptionPlan = async (payload: {
  slug: string
  name: string
  description?: string
  priceCents: number
  currency: string
  workspaceLimit?: number | null
  linkLimitPerWorkspace?: number | null
  isDefault?: boolean
  isActive?: boolean
}) => {
  const response = await apiClient.post('/admin/subscription-plans', payload)
  return response.data as { plan: SubscriptionPlan }
}

export const updateSubscriptionPlan = async (id: string, payload: Partial<Omit<SubscriptionPlan, 'id'>>) => {
  const response = await apiClient.patch(`/admin/subscription-plans/${id}`, payload)
  return response.data as { plan: SubscriptionPlan }
}

export const deleteSubscriptionPlan = async (id: string) => {
  await apiClient.delete(`/admin/subscription-plans/${id}`)
}

export const fetchLinkAddons = async () => {
  const response = await apiClient.get('/admin/link-addons')
  return response.data as { addons: LinkAddon[] }
}

export const createLinkAddon = async (payload: {
  name: string
  description?: string
  additionalLinks: number
  priceCents: number
  currency: string
  isActive?: boolean
}) => {
  const response = await apiClient.post('/admin/link-addons', payload)
  return response.data as { addon: LinkAddon }
}

export const updateLinkAddon = async (id: string, payload: Partial<Omit<LinkAddon, 'id'>>) => {
  const response = await apiClient.patch(`/admin/link-addons/${id}`, payload)
  return response.data as { addon: LinkAddon }
}

export const deleteLinkAddon = async (id: string) => {
  await apiClient.delete(`/admin/link-addons/${id}`)
}

export const fetchAppSettings = async () => {
  const response = await apiClient.get('/admin/settings')
  return response.data as { settings: AppSettingsMap }
}

export const updateAppSettings = async (payload: { defaults?: { workspaceLimit?: number; linkLimit?: number; qrLimit?: number; membersLimit?: number } }) => {
  const response = await apiClient.put('/admin/settings', payload)
  return response.data as { settings: AppSettingsMap }
}
