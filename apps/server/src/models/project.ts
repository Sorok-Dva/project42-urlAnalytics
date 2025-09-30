import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface ProjectAttributes {
  id: string
  workspaceId: string
  ownerId: string
  name: string
  slug: string
  description: string | null
  isPublic: boolean
  publicStatsToken: string | null
  isArchived: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type ProjectCreationAttributes = Optional<
  ProjectAttributes,
  'id' | 'description' | 'isPublic' | 'publicStatsToken' | 'isArchived'
>

export class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  declare id: string
  declare workspaceId: string
  declare ownerId: string
  declare name: string
  declare slug: string
  declare description: string | null
  declare isPublic: boolean
  declare publicStatsToken: string | null
  declare isArchived: boolean
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

Project.init(
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
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    publicStatsToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    sequelize,
    tableName: 'projects',
    underscored: true
  }
)
