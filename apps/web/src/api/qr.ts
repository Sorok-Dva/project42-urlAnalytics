import { apiClient } from './client'
import type { QrCodeSummary } from '../types'

export const fetchQrCodes = async (params?: { search?: string }) => {
  const response = await apiClient.get('/api/qr', { params })
  return response.data.qrCodes as QrCodeSummary[]
}

export const createQrCode = async (payload: Record<string, unknown>) => {
  const response = await apiClient.post('/api/qr', payload)
  return response.data
}

export const downloadQrCode = async (id: string) => {
  const response = await apiClient.get(`/api/qr/${id}/download`, {
    responseType: 'text'
  })
  return response.data as string
}
