import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { Campaign, Unsubscriber } from '@core/models'

export enum WhatsappMessageStatus {
  Sent = 'SENT',
  Delivered = 'DELIVERED',
  Read = 'READ',
  Error = 'ERROR',
  InvalidRecipient = 'INVALID_RECIPIENT',
}
@Table({ tableName: 'whatsapp_messages', underscored: true, timestamps: true })
export class WhatsappMessage extends Model<WhatsappMessage> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @ForeignKey(() => Campaign)
  @ForeignKey(() => Unsubscriber)
  @Column(DataType.INTEGER)
  campaignId: number

  @BelongsTo(() => Campaign)
  campaign: Campaign

  @ForeignKey(() => Unsubscriber)
  @Column(DataType.STRING)
  recipient: string

  @BelongsTo(() => Unsubscriber)
  unsubscriber?: Unsubscriber

  @Column(DataType.JSONB)
  params!: object

  @Column({ type: DataType.STRING, allowNull: true })
  errorCode: string | null

  @Column({
    type: DataType.ENUM(...Object.values(WhatsappMessageStatus)),
    allowNull: true,
  })
  status: WhatsappMessageStatus | null

  @Column({ type: DataType.DATE, allowNull: true })
  dequeuedAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  sentAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  deliveredAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  receivedAt: Date | null
}
