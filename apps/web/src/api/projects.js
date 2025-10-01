import { apiClient } from './client';
export const fetchProjects = async () => {
    const response = await apiClient.get('/projects');
    return response.data.projects;
};
export const toggleProjectPublic = async (id, enabled) => {
    const response = await apiClient.post(`/projects/${id}/public`, { enabled });
    return response.data;
};
