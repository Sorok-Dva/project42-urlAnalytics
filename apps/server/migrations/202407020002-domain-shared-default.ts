import { DataTypes, QueryInterface } from 'sequelize'

export const up = async ({ context }: { context: QueryInterface }) => {
  await context.changeColumn('domains', 'workspace_id', {
    type: DataTypes.UUID,
    allowNull: true
  })
}

export const down = async ({ context }: { context: QueryInterface }) => {
  await context.bulkDelete('domains', { workspace_id: null })
  await context.changeColumn('domains', 'workspace_id', {
    type: DataTypes.UUID,
    allowNull: false
  })
}
