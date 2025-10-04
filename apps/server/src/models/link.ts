import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface GeoRuleAttributes {
  priority: number
  scope: 'country' | 'continent'
  target: string
  url: string
}

export interface LinkAttributes {
  id: string
  workspaceId: string
  projectId: string | null
  domainId: string | null
  slug: string
  label: string | null
  originalUrl: string
  comment: string | null
  status: 'active' | 'archived' | 'deleted'
  geoRules: GeoRuleAttributes[]
  expirationAt: Date | null
  maxClicks: number | null
  clickCount: number
  fallbackUrl: string | null
  publicStats: boolean
  publicStatsToken: string | null
  metadata: Record<string, unknown> | null
  utm: Record<string, string | null> | null
  createdById: string
  createdAt?: Date
  updatedAt?: Date
}

export type LinkCreationAttributes = Optional<
  LinkAttributes,
  | 'id'
  | 'projectId'
  | 'domainId'
  | 'comment'
  | 'label'
  | 'status'
  | 'geoRules'
  | 'expirationAt'
  | 'maxClicks'
  | 'clickCount'
  | 'fallbackUrl'
  | 'publicStats'
  | 'publicStatsToken'
  | 'metadata'
  | 'utm'
>

export class Link extends Model<LinkAttributes, LinkCreationAttributes> implements LinkAttributes {
  declare id: string
  declare workspaceId: string
  declare projectId: string | null
  declare domainId: string | null
  declare slug: string
  declare label: string | null
  declare originalUrl: string
  declare comment: string | null
  declare status: 'active' | 'archived' | 'deleted'
  declare geoRules: GeoRuleAttributes[]
  declare expirationAt: Date | null
  declare maxClicks: number | null
  declare clickCount: number
  declare fallbackUrl: string | null
  declare publicStats: boolean
  declare publicStatsToken: string | null
  declare metadata: Record<string, unknown> | null
  declare utm: Record<string, string | null> | null
  declare createdById: string
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

Link.init(
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
    domainId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    originalUrl: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'archived', 'deleted'),
      allowNull: false,
      defaultValue: 'active'
    },
    geoRules: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    expirationAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    maxClicks: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    clickCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    fallbackUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    publicStats: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    publicStatsToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    utm: {
      type: DataTypes.JSON,
      allowNull: true
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'links',
    underscored: true,
    indexes: [
      { fields: ['workspace_id'] },
      { fields: ['project_id'] },
      { fields: ['slug', 'domain_id'], unique: true }
    ]
  }
)
