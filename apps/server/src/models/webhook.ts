import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface WebhookAttributes {
  id: string
  workspaceId: string
  name: string
  targetUrl: string
  secret: string
  events: string[]
  isActive: boolean
  createdById: string
  createdAt?: Date
  updatedAt?: Date
}

export type WebhookCreationAttributes = Optional<WebhookAttributes, 'id' | 'isActive'>

export class Webhook extends Model<WebhookAttributes, WebhookCreationAttributes> implements WebhookAttributes {
  declare id: string
  declare workspaceId: string
  declare name: string
  declare targetUrl: string
  declare secret: string
  declare events: string[]
  declare isActive: boolean
  declare createdById: string
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

Webhook.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    targetUrl: {
      type: DataTypes.STRING(512),
      allowNull: false
    },
    secret: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    events: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'webhooks',
    underscored: true
  }
)
