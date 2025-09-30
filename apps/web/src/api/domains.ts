import { apiClient } from './client'

export const fetchDomains = async () => {
  const response = await apiClient.get('/api/domains')
  return response.data.domains as Array<{ id: string; domain: string; status: string }>
}
