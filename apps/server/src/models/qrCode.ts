import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface QrCodeAttributes {
  id: string
  workspaceId: string
  projectId: string | null
  linkId: string | null
  name: string
  code: string
  design: Record<string, unknown>
  totalScans: number
  createdById: string
  createdAt?: Date
  updatedAt?: Date
}

export type QrCodeCreationAttributes = Optional<
  QrCodeAttributes,
  'id' | 'projectId' | 'linkId' | 'design' | 'totalScans'
>

export class QrCode
  extends Model<QrCodeAttributes, QrCodeCreationAttributes>
  implements QrCodeAttributes
{
  declare id: string
  declare workspaceId: string
  declare projectId: string | null
  declare linkId: string | null
  declare name: string
  declare code: string
  declare design: Record<string, unknown>
  declare totalScans: number
  declare createdById: string
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

QrCode.init(
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
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    design: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    totalScans: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'qr_codes',
    underscored: true
  }
)
