import {
  DataType,
  Model,
  Column,
  Table,
  BelongsToMany,
} from 'sequelize-typescript'
import { User, UserList } from '@core/models'

@Table({ tableName: 'lists', underscored: true, timestamps: true })
export class List extends Model<List> {
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
  name!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  filename!: string

  @BelongsToMany(() => User, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    through: () => UserList,
    as: 'users',
  })
  users!: Array<User & { UserList: UserList }>
}
