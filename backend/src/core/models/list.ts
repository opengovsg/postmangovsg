import { ChannelType } from '@core/constants'
import { User, UserList } from '@core/models'
import {
  BelongsToMany,
  Column,
  DataType,
  Model,
  Table,
} from 'sequelize-typescript'

@Table({ tableName: 'lists', underscored: true, timestamps: true })
// <Model<Partial<List>> is required to resolve errors in the model.create()
// method call. https://github.com/sequelize/sequelize-typescript/issues/939
export class List extends Model<Partial<List>> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  s3key!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  etag!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  filename!: string

  @Column({
    type: DataType.ENUM(...Object.values(ChannelType)),
    allowNull: false,
  })
  channel!: ChannelType

  @BelongsToMany(() => User, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    through: () => UserList,
    as: 'users',
  })
  users!: Array<User & { UserList: UserList }>
}
