import express, { type Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import apiRouter from './routes/api'
import redirectRouter from './routes/redirect'
import { errorHandler } from './middleware/errorHandler'

export const createApp = (): Application => {
  const app = express()
  app.set('trust proxy', env.nodeEnv === 'production' ? 1 : 'loopback')
  app.use(helmet())
  app.use(
    cors({
      origin: env.corsOrigins.length ? env.corsOrigins : '*',
      credentials: true
    })
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))

  app.use('/api', apiRouter)
  app.use('/', redirectRouter)
  app.use(errorHandler)
  return app
}
