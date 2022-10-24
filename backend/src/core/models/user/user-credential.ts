import { ChannelType } from '@core/constants'
import { Credential } from '@core/models/credential'
import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

import { User } from './user'

@Table({ tableName: 'user_credentials', underscored: true, timestamps: true })
export class UserCredential extends Model<UserCredential> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true,
  })
  userId: number

  @Column({
    type: DataType.STRING,
    primaryKey: true,
    allowNull: false,
  })
  label: string

  @ForeignKey(() => Credential)
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  credName: string

  @Column({
    type: DataType.ENUM(...Object.values(ChannelType)),
    allowNull: false,
  })
  type: ChannelType
}
