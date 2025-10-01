import { io } from 'socket.io-client'
import { API_BASE_URL } from '../api/client'

const socket = io(API_BASE_URL, {
  transports: ['websocket'],
  autoConnect: false
})

export default socket
