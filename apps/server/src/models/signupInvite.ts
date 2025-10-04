import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface SignupInviteAttributes {
  id: string
  code: string
  usedAt: Date | null
  usedById: string | null
  createdAt?: Date
  updatedAt?: Date
}

export type SignupInviteCreationAttributes = Optional<SignupInviteAttributes, 'id' | 'usedAt' | 'usedById'>

export class SignupInvite
  extends Model<SignupInviteAttributes, SignupInviteCreationAttributes>
  implements SignupInviteAttributes
{
  declare id: string
  declare code: string
  declare usedAt: Date | null
  declare usedById: string | null
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

SignupInvite.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    code: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      set(value: string) {
        const normalized = value?.trim().toUpperCase()
        this.setDataValue('code', normalized)
      }
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    usedById: {
      type: DataTypes.UUID,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'signup_invites',
    underscored: true
  }
)
