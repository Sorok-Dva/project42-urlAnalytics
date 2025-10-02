import axios from 'axios'
import { ApiError, getApiErrorMessage } from '../lib/apiError'

const DEFAULT_API_PATH = '/api'

const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+.-]*:/

const isAbsoluteUrl = (value: string) => ABSOLUTE_URL_REGEX.test(value) || value.startsWith('//')

const stripEdgeSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '')

const normalizePath = (value: string) => {
  const withoutWhitespace = value.trim()
  if (!withoutWhitespace) return ''
  const stripped = withoutWhitespace.replace(/\/+$/, '')
  const withoutLeading = stripped.replace(/^\/+/, '')
  return withoutLeading ? `/${withoutLeading}` : ''
}

interface ApiBaseParts {
  origin: string | null
  path: string
}

const resolveApiBaseParts = (rawBaseUrl: string | undefined): ApiBaseParts => {
  if (!rawBaseUrl) {
    return { origin: null, path: DEFAULT_API_PATH }
  }

  const candidate = rawBaseUrl.trim()
  if (!candidate) {
    return { origin: null, path: DEFAULT_API_PATH }
  }

  if (isAbsoluteUrl(candidate)) {
    try {
      const url = new URL(candidate)
      const normalizedPath = normalizePath(url.pathname)
      return { origin: url.origin, path: normalizedPath }
    } catch {
      // fall through to relative handling if URL parsing fails
    }
  }

  const relativePath = normalizePath(candidate)
  return { origin: null, path: relativePath || DEFAULT_API_PATH }
}

const API_BASE = resolveApiBaseParts(import.meta.env.VITE_API_URL)

export const API_BASE_ORIGIN = API_BASE.origin
export const API_BASE_PATH = API_BASE.path

export const API_BASE_URL = API_BASE.origin
  ? `${API_BASE.origin}${API_BASE.path}`
  : API_BASE.path || DEFAULT_API_PATH

const apiBaseURL = API_BASE.origin ?? undefined

export const apiClient = axios.create({
  baseURL: apiBaseURL,
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

apiClient.interceptors.request.use(config => {
  if (config.url && !isAbsoluteUrl(config.url)) {
    const basePath = API_BASE.path ? stripEdgeSlashes(API_BASE.path) : ''
    const requestPath = stripEdgeSlashes(config.url)

    let joinedPath = requestPath

    if (basePath) {
      const basePrefix = `${basePath}/`
      const alreadyPrefixed = joinedPath === basePath || joinedPath.startsWith(basePrefix)
      if (!alreadyPrefixed) {
        joinedPath = joinedPath ? `${basePath}/${joinedPath}` : basePath
      }
    }

    const needsLeadingSlash = !API_BASE.origin

    if (joinedPath) {
      config.url = needsLeadingSlash ? `/${joinedPath}` : joinedPath
    } else if (API_BASE.path) {
      config.url = needsLeadingSlash ? API_BASE.path : stripEdgeSlashes(API_BASE.path)
    }
  }

  return config
})

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common['Authorization']
  }
}
