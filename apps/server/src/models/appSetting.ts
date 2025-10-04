import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../config/database'

export interface AppSettingAttributes {
  key: string
  value: unknown
  createdAt?: Date
  updatedAt?: Date
}

export class AppSetting extends Model<AppSettingAttributes> implements AppSettingAttributes {
  declare key: string
  declare value: unknown
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

AppSetting.init(
  {
    key: {
      type: DataTypes.STRING(128),
      primaryKey: true
    },
    value: {
      type: DataTypes.JSON,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'app_settings',
    underscored: true
  }
)
