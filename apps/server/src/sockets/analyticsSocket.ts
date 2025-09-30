import { Server } from 'socket.io'
import { analyticsEmitter } from '../lib/events'

export const registerAnalyticsSocket = (io: Server) => {
  io.on('connection', socket => {
    socket.on('join', (rooms: string[]) => {
      rooms.forEach(room => socket.join(room))
    })
    socket.on('disconnect', () => {})
  })

  analyticsEmitter.on('link-event', event => {
    io.to(`workspace:${event.workspaceId}`).emit('analytics:event', event)
    if (event.linkId) io.to(`link:${event.linkId}`).emit('analytics:event', event)
    if (event.projectId) io.to(`project:${event.projectId}`).emit('analytics:event', event)
  })
}
