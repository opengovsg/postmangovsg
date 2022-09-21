import {
  DataType,
  Model,
  Column,
  Table,
  ForeignKey,
} from 'sequelize-typescript'

import { User, List } from '@core/models'

@Table({ tableName: 'user_lists', underscored: true, timestamps: true })
export class UserList extends Model<UserList> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  userId!: number

  @ForeignKey(() => List)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  listId!: number
}
