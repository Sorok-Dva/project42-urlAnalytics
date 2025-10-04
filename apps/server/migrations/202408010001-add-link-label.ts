import { DataTypes, QueryInterface } from 'sequelize'

export const up = async ({ context }: { context: QueryInterface }) => {
  await context.addColumn('links', 'label', {
    type: DataTypes.STRING(255),
    allowNull: true
  })
}

export const down = async ({ context }: { context: QueryInterface }) => {
  await context.removeColumn('links', 'label')
}
