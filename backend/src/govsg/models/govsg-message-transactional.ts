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
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: string

  @ForeignKey(() => GovsgTemplate)
  @Column(DataType.BIGINT)
  templateId: number

  @BelongsTo(() => GovsgTemplate)
  template: GovsgTemplate

  @Column({ type: DataType.STRING, allowNull: false })
  recipient: string

  @Column({ type: DataType.JSONB, allowNull: true })
  params: Record<string, string> | null

  @Column({ type: DataType.STRING, allowNull: true })
  serviceProviderMessageId: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  errorCode: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  errorDescription: string | null

  @Column({
    type: DataType.ENUM(...Object.values(GovsgMessageStatus)),
    allowNull: false,
    defaultValue: GovsgMessageStatus.Unsent,
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
