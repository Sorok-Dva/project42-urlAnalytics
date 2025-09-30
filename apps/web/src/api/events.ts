import { apiClient } from './client'
import type { AnalyticsAggregation } from '../types'

export const fetchEventsAnalytics = async (params: {
  period?: string
  projectId?: string | null
  linkId?: string | null
  page?: number
  pageSize?: number
}) => {
  const response = await apiClient.get('/api/events', {
    params: {
      period: params.period,
      projectId: params.projectId ?? undefined,
      linkId: params.linkId ?? undefined,
      page: params.page,
      pageSize: params.pageSize
    }
  })

  return response.data.analytics as AnalyticsAggregation
}
