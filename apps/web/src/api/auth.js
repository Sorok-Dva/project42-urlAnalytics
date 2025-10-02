import { apiClient, setAuthToken } from './client';
export const loginRequest = async (payload) => {
    const response = await apiClient.post('/auth/login', { ...payload });
    const { token, user, workspaceId } = response.data;
    setAuthToken(token);
    return { token, user: user, workspaceId };
};
export const registerRequest = async (payload) => {
    const response = await apiClient.post('/auth/register', payload);
    const { token, user, workspace } = response.data;
    setAuthToken(token);
    return { token, user: user, workspaceId: workspace.id };
};
export const fetchCurrentUser = async (token) => {
    setAuthToken(token);
    const response = await apiClient.get('/auth/me');
    return response.data;
};
export const fetchAuthFeatures = async () => {
    const response = await apiClient.get('/auth/features');
    return response.data;
};
