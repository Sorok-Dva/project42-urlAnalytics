import { Sequelize } from 'sequelize'
import { env } from './env'

const connectionUri = env.databaseUrl ?? `mysql://${env.mysql.user}:${env.mysql.password}@${env.mysql.host}:${env.mysql.port}/${env.mysql.database}`

export const sequelize = new Sequelize(connectionUri, {
  logging: env.nodeEnv === 'development' ? console.log : false,
  dialectOptions: {
    multipleStatements: true
  }
})
