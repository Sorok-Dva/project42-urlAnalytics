import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface DomainAttributes {
  id: string
  workspaceId: string | null
  projectId: string | null
  domain: string
  status: 'pending' | 'verified'
  verificationToken: string
  verifiedAt: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export type DomainCreationAttributes = Optional<
  DomainAttributes,
  'id' | 'workspaceId' | 'projectId' | 'status' | 'verifiedAt'
>

export class Domain extends Model<DomainAttributes, DomainCreationAttributes> implements DomainAttributes {
  declare id: string
  declare workspaceId: string | null
  declare projectId: string | null
  declare domain: string
  declare status: 'pending' | 'verified'
  declare verificationToken: string
  declare verifiedAt: Date | null
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

Domain.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'verified'),
      allowNull: false,
      defaultValue: 'pending'
    },
    verificationToken: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'domains',
    underscored: true
  }
)
