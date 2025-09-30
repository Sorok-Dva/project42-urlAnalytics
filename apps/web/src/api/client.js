import axios from 'axios';
export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
    withCredentials: false
});
export const setAuthToken = (token) => {
    if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    else {
        delete apiClient.defaults.headers.common['Authorization'];
    }
};
