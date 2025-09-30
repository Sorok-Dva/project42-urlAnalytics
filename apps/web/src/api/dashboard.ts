import { apiClient } from './client'

export const fetchOverview = async () => {
  const response = await apiClient.get('/api/dashboard')
  return response.data
}
