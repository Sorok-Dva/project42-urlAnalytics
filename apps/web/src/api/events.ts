import { apiClient } from './client'
import type { AnalyticsAggregation } from '../types'
import type { AggregationInterval } from '@p42/shared'

export const fetchEventsAnalytics = async (params: {
  period?: AggregationInterval
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
