import { DataTypes, QueryInterface } from 'sequelize'

export const up = async ({ context }: { context: QueryInterface }) => {
  const describe = await context.describeTable('workspaces')
  if (!describe.is_default) {
    await context.addColumn('workspaces', 'is_default', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
  }

  const linkDescribe = await context.describeTable('link_events')
  if (!linkDescribe.is_soft_deleted) {
    await context.addColumn('link_events', 'is_soft_deleted', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
  }

  await context.sequelize.query(`
    UPDATE workspaces ws
    JOIN (
      SELECT owner_id, MIN(created_at) AS first_created_at
      FROM workspaces
      GROUP BY owner_id
    ) oldest ON oldest.owner_id = ws.owner_id AND ws.created_at = oldest.first_created_at
    SET ws.is_default = TRUE
  `)
}

export const down = async ({ context }: { context: QueryInterface }) => {
  const linkDescribe = await context.describeTable('link_events')
  if (linkDescribe.is_soft_deleted) {
    await context.removeColumn('link_events', 'is_soft_deleted')
  }

  const describe = await context.describeTable('workspaces')
  if (describe.is_default) {
    await context.removeColumn('workspaces', 'is_default')
  }
}
