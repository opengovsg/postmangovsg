import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  Default,
} from 'sequelize-typescript'
import { User } from './user'

@Table({ tableName: 'user_features', underscored: true, timestamps: true })
export class UserFeatures extends Model<UserFeatures> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true,
  })
  userId!: number

  @Default(null)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  announcementVersion!: number
}
