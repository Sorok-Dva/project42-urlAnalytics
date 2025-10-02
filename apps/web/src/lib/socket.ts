import { io } from 'socket.io-client'
import { API_BASE_ORIGIN, API_BASE_PATH } from '../api/client'

const sanitizePath = (value: string | null | undefined) => (value ? value.replace(/\/$/, '') : '')

const apiPath = sanitizePath(API_BASE_PATH)
const socketPath = apiPath ? `${apiPath}/socket.io` : '/socket.io'
const socketOrigin = API_BASE_ORIGIN ?? (typeof window !== 'undefined' ? window.location.origin : undefined)

const socket = io(socketOrigin, {
  path: socketPath,
  transports: ['websocket'],
  autoConnect: false
})

export default socket
