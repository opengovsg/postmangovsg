import {
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

import { User } from './user'

@Table({ tableName: 'user_demos', underscored: true, timestamps: true })
export class UserDemo extends Model<UserDemo> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true,
  })
  userId: number

  @Default(3)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  numDemosSms: number

  @Default(3)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  numDemosTelegram: number

  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  isDisplayed: boolean
}
