import { DataTypes, QueryInterface } from 'sequelize'
import { randomUUID } from 'node:crypto'

const DEFAULT_SETTINGS: Array<{ key: string; value: unknown }> = [
  { key: 'defaults.workspaceLimit', value: 1 },
  { key: 'defaults.linkLimit', value: 10 },
  { key: 'defaults.qrLimit', value: 500 },
  { key: 'defaults.membersLimit', value: 5 }
]

export const up = async ({ context }: { context: QueryInterface }) => {
  await context.createTable('subscription_plans', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    slug: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price_cents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'EUR'
    },
    workspace_limit: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    link_limit_per_workspace: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  await context.createTable('link_addons', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    additional_links: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price_cents: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'EUR'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  await context.createTable('app_settings', {
    key: {
      type: DataTypes.STRING(128),
      primaryKey: true
    },
    value: {
      type: DataTypes.JSON,
      allowNull: false
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  })

  if (!(await context.describeTable('workspaces')).plan_id) {
    await context.addColumn('workspaces', 'plan_id', {
      type: DataTypes.UUID,
      allowNull: true
    })
    await context.addConstraint('workspaces', {
      fields: ['plan_id'],
      type: 'foreign key',
      name: 'workspaces_plan_id_fkey',
      references: {
        table: 'subscription_plans',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    })
  }

  const [defaultWorkspaceLimit, defaultLinkLimit] = [1, 10]

  const [existingFreePlan] = await context.sequelize.query(
    `SELECT id FROM subscription_plans WHERE slug = 'free' LIMIT 1`
  ) as Array<Array<{ id: string }>>

  const freePlanId = existingFreePlan && existingFreePlan.length > 0 ? existingFreePlan[0].id : randomUUID()

  if (!existingFreePlan || existingFreePlan.length === 0) {
    await context.bulkInsert('subscription_plans', [
      {
        id: freePlanId,
        slug: 'free',
        name: 'Freemium',
        description: 'Plan par défaut gratuit',
        price_cents: 0,
        currency: 'EUR',
        workspace_limit: defaultWorkspaceLimit,
        link_limit_per_workspace: defaultLinkLimit,
        is_default: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ])
  }

  for (const setting of DEFAULT_SETTINGS) {
    await context.sequelize.query(
      `INSERT INTO app_settings (\`key\`, \`value\`, created_at, updated_at)
       VALUES (:key, CAST(:value AS JSON), :createdAt, :updatedAt)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updated_at = VALUES(updated_at)`,
      {
        replacements: {
          key: setting.key,
          value: JSON.stringify(setting.value),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    )
  }

  await context.sequelize.query(
    `UPDATE workspaces SET plan_id = :freePlanId WHERE plan = 'free' AND plan_id IS NULL`,
    { replacements: { freePlanId } }
  )

  await context.sequelize.query(
    `UPDATE workspaces
     SET plan_limits = JSON_OBJECT(
       'links', :linkLimit,
       'qrCodes', COALESCE(JSON_EXTRACT(plan_limits, '$.qrCodes'), :qrLimit),
       'members', COALESCE(JSON_EXTRACT(plan_limits, '$.members'), :membersLimit),
       'workspaces', :workspaceLimit
     )
     WHERE plan = 'free'`,
    {
      replacements: {
        linkLimit: defaultLinkLimit,
        workspaceLimit: defaultWorkspaceLimit,
        qrLimit: 500,
        membersLimit: 5
      }
    }
  )
}

export const down = async ({ context }: { context: QueryInterface }) => {
  const workspaceDescribe = await context.describeTable('workspaces')
  if (workspaceDescribe.plan_id) {
    await context.removeConstraint('workspaces', 'workspaces_plan_id_fkey').catch(() => {})
    await context.removeColumn('workspaces', 'plan_id')
  }

  await context.dropTable('app_settings')
  await context.dropTable('link_addons')
  await context.dropTable('subscription_plans')
}
