import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import { WorkspaceRole } from '@p42/shared'

export interface WorkspaceMemberAttributes {
  id: string
  workspaceId: string
  userId: string
  role: WorkspaceRole
  status: 'active' | 'pending'
  invitedById: string | null
  createdAt?: Date
  updatedAt?: Date
}

export type WorkspaceMemberCreationAttributes = Optional<WorkspaceMemberAttributes, 'id' | 'status' | 'invitedById'>

export class WorkspaceMember
  extends Model<WorkspaceMemberAttributes, WorkspaceMemberCreationAttributes>
  implements WorkspaceMemberAttributes
{
  declare id: string
  declare workspaceId: string
  declare userId: string
  declare role: WorkspaceRole
  declare status: 'active' | 'pending'
  declare invitedById: string | null
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

WorkspaceMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'),
      allowNull: false,
      defaultValue: 'viewer'
    },
    status: {
      type: DataTypes.ENUM('active', 'pending'),
      allowNull: false,
      defaultValue: 'active'
    },
    invitedById: {
      type: DataTypes.UUID,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'workspace_members',
    underscored: true
  }
)
