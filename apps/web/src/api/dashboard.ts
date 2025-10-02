import type { DashboardTimeRange } from '@p42/shared'
import { apiClient } from './client'

export const fetchOverview = async (range: DashboardTimeRange) => {
  const response = await apiClient.get('/dashboard', { params: { range } })
  return response.data
}
