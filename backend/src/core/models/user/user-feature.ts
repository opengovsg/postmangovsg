import {
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

import { User } from './user'

@Table({ tableName: 'user_features', underscored: true, timestamps: true })
export class UserFeature extends Model<UserFeature> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true,
  })
  userId: number

  @Default(null)
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  announcementVersion: string | null
}
