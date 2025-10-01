import { apiClient } from './client'
import type { AnalyticsAggregation } from '../types'

export const fetchEventsAnalytics = async (params: {
  period?: string
  projectId?: string | null
  linkId?: string | null
  page?: number
  pageSize?: number
  filters?: string
}) => {
  const response = await apiClient.get('/events', {
    params: {
      period: params.period,
      projectId: params.projectId ?? undefined,
      linkId: params.linkId ?? undefined,
      page: params.page,
      pageSize: params.pageSize,
      filters: params.filters
    }
  })

  return response.data.analytics as AnalyticsAggregation
}
