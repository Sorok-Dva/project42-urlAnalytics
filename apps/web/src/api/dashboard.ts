import { apiClient } from './client'

export const fetchOverview = async () => {
  const response = await apiClient.get('/dashboard')
  return response.data
}
