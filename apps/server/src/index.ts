import http from 'http'
import { Server } from 'socket.io'
import { env } from './config/env'
import { sequelize } from './config/database'
import { registerAssociations } from './models'
import { registerAnalyticsSocket } from './sockets/analyticsSocket'
import { createApp } from './app'

const start = async () => {
  try {
    await sequelize.authenticate()
    registerAssociations()
    if (env.nodeEnv !== 'production') {
      await sequelize.sync()
    }

    const app = createApp()
    const server = http.createServer(app)
    const io = new Server(server, {
      cors: {
        origin: env.corsOrigins.length ? env.corsOrigins : '*',
        credentials: true
      },
      path: '/api/socket.io'
    })
    registerAnalyticsSocket(io)

    server.listen(env.port, () => {
      console.log(`p42-urlManager server running on port ${env.port}`)
    })
  } catch (error) {
    console.error('Failed to start server', error)
    process.exit(1)
  }
}

start()
