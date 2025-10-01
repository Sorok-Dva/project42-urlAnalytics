import { apiClient } from './client'
import type { Link, AnalyticsAggregation } from '../types'

export const fetchLinks = async (params?: Record<string, string | number | undefined>) => {
  const response = await apiClient.get('/links', { params })
  return response.data.links as Link[]
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
