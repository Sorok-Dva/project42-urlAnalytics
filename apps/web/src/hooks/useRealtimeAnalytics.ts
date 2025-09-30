import { useEffect } from 'react'
import socket from '../lib/socket'

interface RealtimeEvent {
  linkId: string
  projectId: string | null
  workspaceId: string
  eventType: string
  event: {
    occurredAt: string
  }
}

export const useRealtimeAnalytics = (rooms: string[], onEvent: (event: RealtimeEvent) => void) => {
  useEffect(() => {
    if (!rooms.length) return
    if (!socket.connected) socket.connect()
    socket.emit('join', rooms)
    const handler = (event: RealtimeEvent) => onEvent(event)
    socket.on('analytics:event', handler)
    return () => {
      socket.off('analytics:event', handler)
    }
  }, [rooms.join('|')])
}
