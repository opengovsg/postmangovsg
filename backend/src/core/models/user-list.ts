import { List, User } from '@core/models'
import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

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
