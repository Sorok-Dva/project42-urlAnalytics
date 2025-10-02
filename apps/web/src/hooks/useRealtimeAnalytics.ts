import { useEffect, useMemo, useRef } from 'react'
import socket from '../lib/socket'

interface RealtimeEvent {
  linkId: string
  projectId: string | null
  workspaceId: string
  eventType: string
  event: {
    occurredAt: string
    interactionType?: string
    [key: string]: unknown
  }
}

export const useRealtimeAnalytics = (rooms: string[], onEvent: (event: RealtimeEvent) => void) => {
  const callbackRef = useRef(onEvent)

  useEffect(() => {
    callbackRef.current = onEvent
  }, [onEvent])

  const normalizedRooms = useMemo(() => Array.from(new Set(rooms)).filter(Boolean), [rooms])
  const roomsKey = normalizedRooms.join('|')

  useEffect(() => {
    if (normalizedRooms.length === 0) {
      return () => {}
    }
    if (!socket.connected) socket.connect()
    socket.emit('join', normalizedRooms)
    const handler = (event: RealtimeEvent) => callbackRef.current(event)
    socket.on('analytics:event', handler)
    return () => {
      socket.emit('leave', normalizedRooms)
      socket.off('analytics:event', handler)
    }
  }, [roomsKey])
}
