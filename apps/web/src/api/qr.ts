import { apiClient } from './client'
import type { QrCodeDetail, QrCodeSummary } from '../types'

export const fetchQrCodes = async (params?: { search?: string }) => {
  const response = await apiClient.get('/qr', { params })
  return response.data.qrCodes as QrCodeSummary[]
}

export const createQrCode = async (payload: Record<string, unknown>) => {
  const response = await apiClient.post('/qr', payload)
  return response.data
}

export const downloadQrCode = async (id: string) => {
  const response = await apiClient.get(`/qr/${id}/download`, {
    responseType: 'text'
  })
  return response.data as string
}

export const fetchQrCode = async (id: string) => {
  const response = await apiClient.get(`/qr/${id}`)
  return response.data.qr as QrCodeDetail
}

export const updateQrCode = async (id: string, payload: Record<string, unknown>) => {
  const response = await apiClient.patch(`/qr/${id}`, payload)
  return response.data.qr as QrCodeDetail
}

export const deleteQrCode = async (id: string) => {
  await apiClient.delete(`/qr/${id}`)
}
