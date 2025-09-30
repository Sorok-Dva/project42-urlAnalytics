import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import type { WorkspaceMember } from './workspaceMember'
import { WorkspaceRole } from '@p42/shared'

export interface UserAttributes {
  id: string
  email: string
  passwordHash: string | null
  name: string
  avatarUrl: string | null
  timezone: string | null
  lastLoginAt: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export type UserCreationAttributes = Optional<
  UserAttributes,
  'id' | 'passwordHash' | 'avatarUrl' | 'timezone' | 'lastLoginAt'
>

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string
  declare email: string
  declare passwordHash: string | null
  declare name: string
  declare avatarUrl: string | null
  declare timezone: string | null
  declare lastLoginAt: Date | null
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  static associate(models: any) {
    const { WorkspaceMember, Workspace, Project, Link, ApiKey } = models
    User.hasMany(WorkspaceMember, { foreignKey: 'userId', as: 'memberships' })
    User.hasMany(Workspace, { foreignKey: 'ownerId', as: 'ownedWorkspaces' })
    User.hasMany(Project, { foreignKey: 'ownerId', as: 'ownedProjects' })
    User.hasMany(Link, { foreignKey: 'createdById', as: 'createdLinks' })
    User.hasMany(ApiKey, { foreignKey: 'createdById', as: 'apiKeys' })
  }

  hasRole(workspaceId: string, role: WorkspaceRole) {
    if (!this.memberships) return false
    const membership = this.memberships.find(member => member.workspaceId === workspaceId)
    if (!membership) return false
    if (membership.role === 'owner') return true
    if (role === 'admin') return ['admin'].includes(membership.role)
    if (role === 'member') return ['admin', 'member'].includes(membership.role)
    return membership.role === role
  }

  memberships?: Array<WorkspaceMember>
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    avatarUrl: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true
  }
)
