import { apiClient } from './client'
import type { Link, AnalyticsAggregation } from '../types'

export interface PaginatedLinksResponse {
  links: Link[]
  total: number
  page: number
  pageSize: number
}

export const fetchLinks = async (
  params?: Record<string, string | number | undefined>
): Promise<PaginatedLinksResponse> => {
  const response = await apiClient.get('/links', { params })
  const links = (response.data.links ?? []) as Link[]
  const totalRaw = response.data.total
  const pageRaw = response.data.page
  const pageSizeRaw = response.data.pageSize

  const total = typeof totalRaw === 'number' ? totalRaw : Number(totalRaw ?? links.length ?? 0)
  const page = typeof pageRaw === 'number' ? pageRaw : Number(pageRaw ?? params?.page ?? 1)
  const inferredPageSize =
    typeof params?.pageSize === 'number' ? params?.pageSize : Number(params?.pageSize ?? 0)
  const pageSize =
    typeof pageSizeRaw === 'number'
      ? pageSizeRaw
      : inferredPageSize > 0
        ? inferredPageSize
        : links.length || 25

  return {
    links,
    total: Number.isFinite(total) ? total : 0,
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 25
  }
}

export const fetchAllLinks = async (
  params?: Record<string, string | number | undefined>
): Promise<Link[]> => {
  const baseParams: Record<string, string | number | undefined> = { ...(params ?? {}) }
  delete baseParams.page

  const firstPage = await fetchLinks({ ...baseParams, page: 1 })
  const items = [...firstPage.links]
  const totalPages = Math.ceil(firstPage.total / firstPage.pageSize)

  if (totalPages <= firstPage.page) {
    return items
  }

  for (let page = firstPage.page + 1; page <= totalPages; page += 1) {
    const next = await fetchLinks({ ...baseParams, page })
    items.push(...next.links)
  }

  return items
}

export const createLinkRequest = async (payload: Record<string, unknown>) => {
  const response = await apiClient.post('/links', payload)
  return response.data.link as Link
}

export const updateLinkRequest = async (id: string, payload: Record<string, unknown>) => {
  const response = await apiClient.patch(`/links/${id}`, payload)
  return response.data.link as Link
}

export const fetchLinkDetails = async (id: string) => {
  const response = await apiClient.get(`/links/${id}`)
  return response.data.link as Link
}

export const fetchLinkAnalytics = async (
  id: string,
  params: { interval?: string; page?: number; pageSize?: number; projectId?: string }
) => {
  const response = await apiClient.get(`/links/${id}/stats`, { params })
  return response.data.analytics as AnalyticsAggregation
}

export const toggleLinkPublicStats = async (id: string, enabled: boolean) => {
  const response = await apiClient.post(`/links/${id}/public`, { enabled })
  return response.data
}

export const archiveLinkRequest = async (id: string) => {
  const response = await apiClient.post(`/links/${id}/archive`)
  return response.data.link as Link
}

export const unarchiveLinkRequest = async (id: string) => {
  const response = await apiClient.post(`/links/${id}/unarchive`)
  return response.data.link as Link
}

export const deleteLinkRequest = async (id: string) => {
  const response = await apiClient.delete(`/links/${id}`)
  return response.data.link as Link
}

export const exportLinkStats = async (id: string, format: 'csv' | 'json') => {
  const response = await apiClient.get(`/links/${id}/export`, {
    params: { format },
    responseType: 'text'
  })
  return response.data as string
}

export const transferLinkRequest = async (
  id: string,
  payload: { workspaceId: string; domain?: string; projectId?: string | null }
) => {
  const response = await apiClient.post(`/links/${id}/transfer`, payload)
  return response.data.link as Link
}

export const transferLinksBulkRequest = async (payload: {
  linkIds: string[]
  workspaceId: string
  domain?: string
  projectId?: string | null
}) => {
  const response = await apiClient.post('/links/transfer', payload)
  return response.data.links as Link[]
}
