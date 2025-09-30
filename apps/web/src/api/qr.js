import { apiClient } from './client';
export const fetchQrCodes = async (params) => {
    const response = await apiClient.get('/api/qr', { params });
    return response.data.qrCodes;
};
export const createQrCode = async (payload) => {
    const response = await apiClient.post('/api/qr', payload);
    return response.data;
};
export const downloadQrCode = async (id) => {
    const response = await apiClient.get(`/api/qr/${id}/download`, {
        responseType: 'text'
    });
    return response.data;
};
export const fetchQrCode = async (id) => {
    const response = await apiClient.get(`/api/qr/${id}`);
    return response.data.qr;
};
export const updateQrCode = async (id, payload) => {
    const response = await apiClient.patch(`/api/qr/${id}`, payload);
    return response.data.qr;
};
