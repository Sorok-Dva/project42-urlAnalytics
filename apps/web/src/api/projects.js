import { apiClient } from './client';
export const fetchProjects = async () => {
    const response = await apiClient.get('/api/projects');
    return response.data.projects;
};
export const toggleProjectPublic = async (id, enabled) => {
    const response = await apiClient.post(`/api/projects/${id}/public`, { enabled });
    return response.data;
};
