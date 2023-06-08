import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { GovsgTemplate } from './govsg-template'
import { GovsgMessageStatus } from '@core/constants'

@Table({
  tableName: 'govsg_messages_transactional',
  underscored: true,
  timestamps: true,
})
export class GovsgMessageTransactional extends Model<GovsgMessageTransactional> {
  @ForeignKey(() => GovsgTemplate)
  @Column(DataType.BIGINT)
  templateId: number

  @BelongsTo(() => GovsgTemplate)
  template: GovsgTemplate

  @Column(DataType.STRING)
  recipient: string

  @Column(DataType.JSONB)
  params!: object

  @Column(DataType.STRING)
  serviceProviderMessageId?: string

  @Column({ type: DataType.STRING, allowNull: true })
  errorCode: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  errorDescription: string | null

  @Column({
    type: DataType.ENUM(...Object.values(GovsgMessageStatus)),
    allowNull: true,
  })
  status: GovsgMessageStatus | null

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
