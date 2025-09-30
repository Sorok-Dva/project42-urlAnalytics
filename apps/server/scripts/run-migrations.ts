import path from 'path'
import { Umzug, SequelizeStorage } from 'umzug'
import { sequelize } from '../src/config/database'
import { registerAssociations } from '../src/models'

const runner = new Umzug({
  migrations: {
    glob: path.resolve(__dirname, '../migrations/*.ts')
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console
})

const main = async () => {
  await sequelize.authenticate()
  registerAssociations()
  await runner.up()
  console.log('Migrations executed')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
