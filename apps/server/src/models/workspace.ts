import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface WorkspaceAttributes {
  id: string
  name: string
  slug: string
  ownerId: string
  plan: 'free' | 'pro' | 'enterprise'
  planLimits: Record<string, unknown>
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type WorkspaceCreationAttributes = Optional<WorkspaceAttributes, 'id' | 'plan' | 'planLimits' | 'isActive'>

export class Workspace extends Model<WorkspaceAttributes, WorkspaceCreationAttributes> implements WorkspaceAttributes {
  declare id: string
  declare name: string
  declare slug: string
  declare ownerId: string
  declare plan: 'free' | 'pro' | 'enterprise'
  declare planLimits: Record<string, unknown>
  declare isActive: boolean
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  static associate(models: any) {
    const { WorkspaceMember, Project, Domain, Link, Webhook, ApiKey } = models
    Workspace.hasMany(WorkspaceMember, { foreignKey: 'workspaceId', as: 'members' })
    Workspace.hasMany(Project, { foreignKey: 'workspaceId', as: 'projects' })
    Workspace.hasMany(Domain, { foreignKey: 'workspaceId', as: 'domains' })
    Workspace.hasMany(Link, { foreignKey: 'workspaceId', as: 'links' })
    Workspace.hasMany(Webhook, { foreignKey: 'workspaceId', as: 'webhooks' })
    Workspace.hasMany(ApiKey, { foreignKey: 'workspaceId', as: 'apiKeys' })
  }
}

Workspace.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    plan: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'free'
    },
    planLimits: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        links: 1000,
        qrCodes: 500,
        members: 10
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'workspaces',
    underscored: true
  }
)
