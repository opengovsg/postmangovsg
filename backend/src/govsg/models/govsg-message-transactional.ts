import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { GovsgTemplate } from './govsg-template'
import { GovsgMessageStatus } from '@core/constants'
import { User } from '@core/models'

@Table({
  tableName: 'govsg_messages_transactional',
  underscored: true,
  timestamps: true,
})
export class GovsgMessageTransactional extends Model<GovsgMessageTransactional> {
  @ForeignKey(() => GovsgTemplate)
  @Column(DataType.BIGINT)
  templateId: number

  @ForeignKey(() => User)
  @Column({ type: DataType.STRING, allowNull: false })
  userId: string

  @Column({ type: DataType.STRING, allowNull: false })
  recipient: string

  @Column({ type: DataType.JSONB, allowNull: false })
  params: object

  @Column({ type: DataType.STRING, allowNull: true })
  serviceProviderMessageId: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  errorCode: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  errorDescription: string | null

  @Column({
    type: DataType.ENUM(...Object.values(GovsgMessageStatus)),
  })
  status: GovsgMessageStatus

  @Column({ type: DataType.DATE, allowNull: true })
  acceptedAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  sentAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  deliveredAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  readAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  erroredAt: Date | null
}
