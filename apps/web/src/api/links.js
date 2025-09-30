import { apiClient } from './client';
export const fetchLinks = async (params) => {
    const response = await apiClient.get('/api/links', { params });
    return response.data.links;
};
export const createLinkRequest = async (payload) => {
    const response = await apiClient.post('/api/links', payload);
    return response.data.link;
};
export const updateLinkRequest = async (id, payload) => {
    const response = await apiClient.patch(`/api/links/${id}`, payload);
    return response.data.link;
};
export const fetchLinkDetails = async (id) => {
    const response = await apiClient.get(`/api/links/${id}`);
    return response.data.link;
};
export const fetchLinkAnalytics = async (id, params) => {
    const response = await apiClient.get(`/api/links/${id}/stats`, { params });
    return response.data.analytics;
};
export const toggleLinkPublicStats = async (id, enabled) => {
    const response = await apiClient.post(`/api/links/${id}/public`, { enabled });
    return response.data;
};
export const archiveLinkRequest = async (id) => {
    const response = await apiClient.post(`/api/links/${id}/archive`);
    return response.data.link;
};
export const unarchiveLinkRequest = async (id) => {
    const response = await apiClient.post(`/api/links/${id}/unarchive`);
    return response.data.link;
};
export const deleteLinkRequest = async (id) => {
    const response = await apiClient.delete(`/api/links/${id}`);
    return response.data.link;
};
export const exportLinkStats = async (id, format) => {
    const response = await apiClient.get(`/api/links/${id}/export`, {
        params: { format },
        responseType: 'text'
    });
    return response.data;
};
