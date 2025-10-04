import { DataTypes, QueryInterface } from 'sequelize'

export const up = async ({ context }: { context: QueryInterface }) => {
  await context.createTable('signup_invites', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    code: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    used_by_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })
}

export const down = async ({ context }: { context: QueryInterface }) => {
  await context.dropTable('signup_invites')
}
