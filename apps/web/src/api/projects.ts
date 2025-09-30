import { apiClient } from './client'
import type { Project } from '../types'

export const fetchProjects = async () => {
  const response = await apiClient.get('/api/projects')
  return response.data.projects as Project[]
}

export const toggleProjectPublic = async (id: string, enabled: boolean) => {
  const response = await apiClient.post(`/api/projects/${id}/public`, { enabled })
  return response.data
}
