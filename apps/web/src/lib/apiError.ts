import { isAxiosError } from 'axios'

export const getApiErrorMessage = (error: unknown, fallback = 'Unexpected error') => {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: unknown; message?: unknown } | undefined
    const message = data?.error ?? data?.message
    if (typeof message === 'string' && message.trim().length > 0) return message
    if (typeof error.message === 'string' && error.message.trim().length > 0) return error.message
  }

  if (error instanceof Error && error.message.trim().length > 0) return error.message
  return fallback
}

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
