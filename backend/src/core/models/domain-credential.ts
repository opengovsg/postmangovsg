import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { Credential } from '@core/models/credential'
import { ChannelType } from '@core/constants'
import { Domain } from '@core/models/domain'

@Table({ tableName: 'domain_credentials', underscored: true, timestamps: true })
export class DomainCredential extends Model<DomainCredential> {
  @ForeignKey(() => Domain)
  @Column({
    type: DataType.STRING,
    primaryKey: true,
    allowNull: false,
  })
  domain: string

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
