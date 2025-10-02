import { apiClient } from './client';
export const fetchQrCodes = async (params) => {
    const response = await apiClient.get('/qr', { params });
    return response.data.qrCodes;
};
export const createQrCode = async (payload) => {
    const response = await apiClient.post('/qr', payload);
    return response.data;
};
export const downloadQrCode = async (id) => {
    const response = await apiClient.get(`/qr/${id}/download`, {
        responseType: 'text'
    });
    return response.data;
};
export const fetchQrCode = async (id) => {
    const response = await apiClient.get(`/qr/${id}`);
    return response.data.qr;
};
export const updateQrCode = async (id, payload) => {
    const response = await apiClient.patch(`/qr/${id}`, payload);
    return response.data.qr;
};
export const deleteQrCode = async (id) => {
    await apiClient.delete(`/qr/${id}`);
};
