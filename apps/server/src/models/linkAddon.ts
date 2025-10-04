import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface LinkAddonAttributes {
  id: string
  name: string
  description?: string | null
  additionalLinks: number
  priceCents: number
  currency: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type LinkAddonCreationAttributes = Optional<LinkAddonAttributes, 'id' | 'description' | 'isActive'>

export class LinkAddon
  extends Model<LinkAddonAttributes, LinkAddonCreationAttributes>
  implements LinkAddonAttributes
{
  declare id: string
  declare name: string
  declare description: string | null
  declare additionalLinks: number
  declare priceCents: number
  declare currency: string
  declare isActive: boolean
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

LinkAddon.init(
  {
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
    additionalLinks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'additional_links'
    },
    priceCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'price_cents'
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'EUR'
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
    tableName: 'link_addons',
    underscored: true
  }
)
