import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface SubscriptionPlanAttributes {
  id: string
  slug: string
  name: string
  description?: string | null
  priceCents: number
  currency: string
  workspaceLimit?: number | null
  linkLimitPerWorkspace?: number | null
  isDefault: boolean
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type SubscriptionPlanCreationAttributes = Optional<
  SubscriptionPlanAttributes,
  'id' | 'description' | 'workspaceLimit' | 'linkLimitPerWorkspace' | 'isDefault' | 'isActive'
>

export class SubscriptionPlan
  extends Model<SubscriptionPlanAttributes, SubscriptionPlanCreationAttributes>
  implements SubscriptionPlanAttributes
{
  declare id: string
  declare slug: string
  declare name: string
  declare description: string | null
  declare priceCents: number
  declare currency: string
  declare workspaceLimit: number | null
  declare linkLimitPerWorkspace: number | null
  declare isDefault: boolean
  declare isActive: boolean
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  static associate(models: any) {
    SubscriptionPlan.hasMany(models.Workspace, { foreignKey: 'planId', as: 'workspaces' })
  }
}

SubscriptionPlan.init(
  {
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
    priceCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'price_cents'
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'EUR'
    },
    workspaceLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'workspace_limit'
    },
    linkLimitPerWorkspace: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'link_limit_per_workspace'
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_default'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    }
  },
  {
    sequelize,
    tableName: 'subscription_plans',
    underscored: true
  }
)
