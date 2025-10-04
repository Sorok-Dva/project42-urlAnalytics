import { DataTypes, QueryInterface } from 'sequelize'

export const up = async ({ context }: { context: QueryInterface }) => {
  await context.addColumn('users', 'role', {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user'
  })

  await context.sequelize.query("UPDATE users SET role = 'user' WHERE role IS NULL")
  await context.changeColumn('users', 'role', {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user'
  })
}

export const down = async ({ context }: { context: QueryInterface }) => {
  await context.removeColumn('users', 'role')
}
