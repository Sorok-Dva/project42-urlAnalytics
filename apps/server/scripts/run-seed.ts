import { sequelize } from '../src/config/database'
import { registerAssociations } from '../src/models'
import { runDemoSeed } from '../seeders/demoSeed'

const main = async () => {
  await sequelize.authenticate()
  registerAssociations()
  await runDemoSeed()
  console.log('Seed completed')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
