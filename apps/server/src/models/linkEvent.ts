import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type LinkEventType = 'click' | 'scan' | 'direct' | 'api' | 'bot'

export interface LinkEventAttributes {
  id: string
  workspaceId: string
  projectId: string | null
  linkId: string
  eventType: LinkEventType
  referer: string | null
  device: string | null
  os: string | null
  browser: string | null
  language: string | null
  country: string | null
  city: string | null
  continent: string | null
  latitude: number | null
  longitude: number | null
  isBot: boolean
  ipHash: string | null
  userAgent: string | null
  occurredAt: Date
  metadata: Record<string, unknown> | null
  utm: Record<string, string | null> | null
  softDeleted: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type LinkEventCreationAttributes = Optional<
  LinkEventAttributes,
  | 'id'
  | 'projectId'
  | 'referer'
  | 'device'
  | 'os'
  | 'browser'
  | 'language'
  | 'country'
  | 'city'
  | 'continent'
  | 'latitude'
  | 'longitude'
  | 'isBot'
  | 'ipHash'
  | 'userAgent'
  | 'metadata'
  | 'utm'
  | 'softDeleted'
>

export class LinkEvent
  extends Model<LinkEventAttributes, LinkEventCreationAttributes>
  implements LinkEventAttributes
{
  declare id: string
  declare workspaceId: string
  declare projectId: string | null
  declare linkId: string
  declare eventType: LinkEventType
  declare referer: string | null
  declare device: string | null
  declare os: string | null
  declare browser: string | null
  declare language: string | null
  declare country: string | null
  declare city: string | null
  declare continent: string | null
  declare latitude: number | null
  declare longitude: number | null
  declare isBot: boolean
  declare ipHash: string | null
  declare userAgent: string | null
  declare occurredAt: Date
  declare metadata: Record<string, unknown> | null
  declare utm: Record<string, string | null> | null
  declare softDeleted: boolean
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

LinkEvent.init(
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
    linkId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    eventType: {
      type: DataTypes.ENUM('click', 'scan', 'direct', 'api', 'bot'),
      allowNull: false
    },
    referer: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    device: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    os: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    browser: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    language: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    continent: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    isBot: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    ipHash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    occurredAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    utm: {
      type: DataTypes.JSON,
      allowNull: true
    },
    softDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_soft_deleted'
    }
  },
  {
    sequelize,
    tableName: 'link_events',
    underscored: true,
    indexes: [
      { fields: ['workspace_id', 'occurred_at'] },
      { fields: ['link_id', 'occurred_at'] },
      { fields: ['event_type'] }
    ]
  }
)
