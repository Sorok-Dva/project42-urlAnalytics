import { config } from 'dotenv'
import path from 'path'
import { beforeAll, beforeEach, afterAll } from 'vitest'
import { sequelize } from '../src/config/database'
import { registerAssociations } from '../src/models'

config({ path: path.resolve(process.cwd(), '../../.env.test') })

beforeAll(async () => {
  registerAssociations()
  await sequelize.sync({ force: true })
})

beforeEach(async () => {
  await sequelize.truncate({ cascade: true, restartIdentity: true })
})

afterAll(async () => {
  await sequelize.close()
})
