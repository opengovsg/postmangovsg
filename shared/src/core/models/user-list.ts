import {
  DataType,
  Model,
  Column,
  Table,
  ForeignKey,
} from 'sequelize-typescript'

import { User, List } from '../models/index'

@Table({ tableName: 'user_lists', underscored: true, timestamps: true })
// <Model<Partial<List>> is required to resolve errors in the model.create()
// method call. https://github.com/sequelize/sequelize-typescript/issues/939
export class UserList extends Model<Partial<UserList>> {
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
