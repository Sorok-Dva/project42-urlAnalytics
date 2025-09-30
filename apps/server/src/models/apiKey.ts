import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface ApiKeyAttributes {
  id: string
  workspaceId: string
  projectId: string | null
  name: string
  tokenHash: string
  scopes: string[]
  lastUsedAt: Date | null
  createdById: string
  createdAt?: Date
  updatedAt?: Date
}

export type ApiKeyCreationAttributes = Optional<ApiKeyAttributes, 'id' | 'projectId' | 'lastUsedAt'>

export class ApiKey extends Model<ApiKeyAttributes, ApiKeyCreationAttributes> implements ApiKeyAttributes {
  declare id: string
  declare workspaceId: string
  declare projectId: string | null
  declare name: string
  declare tokenHash: string
  declare scopes: string[]
  declare lastUsedAt: Date | null
  declare createdById: string
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

ApiKey.init(
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
    projectId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    scopes: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'api_keys',
    underscored: true
  }
)
