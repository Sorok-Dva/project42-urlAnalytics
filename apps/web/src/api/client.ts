import axios from 'axios'
import { ApiError, getApiErrorMessage } from '../lib/apiError'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: false
})

apiClient.interceptors.response.use(
  response => response,
  error => {
    const message = getApiErrorMessage(error, 'Erreur serveur')
    const status = error?.response?.status
    return Promise.reject(new ApiError(message, status))
  }
)

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common['Authorization']
  }
}
