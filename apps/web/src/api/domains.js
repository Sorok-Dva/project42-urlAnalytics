import { apiClient } from './client';
export const fetchDomains = async () => {
    const response = await apiClient.get('/domains');
    return response.data.domains;
};
