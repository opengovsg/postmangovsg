import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
} from 'sequelize-typescript'
import { User } from './user'
import { Credential } from '@shared/core/models/credential'
import { ChannelType } from '../../constants'

@Table({ tableName: 'user_credentials', underscored: true, timestamps: true })
export class UserCredential extends Model<UserCredential> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true,
  })
  userId!: number

  @Column({
    type: DataType.STRING,
    primaryKey: true,
    allowNull: false,
  })
  label!: string

  @ForeignKey(() => Credential)
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  credName!: string

  @Column({
    type: DataType.ENUM(...Object.values(ChannelType)),
    allowNull: false,
  })
  type!: ChannelType
}
