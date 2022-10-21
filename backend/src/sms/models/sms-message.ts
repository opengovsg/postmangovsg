import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
} from 'sequelize-typescript'
import { Campaign } from '@core/models/campaign'
import { MessageStatus } from '@core/constants'

@Table({ tableName: 'sms_messages', underscored: true, timestamps: true })
export class SmsMessage extends Model<SmsMessage> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @ForeignKey(() => Campaign)
  @Column(DataType.INTEGER)
  campaignId!: number

  @BelongsTo(() => Campaign)
  campaign!: Campaign

  @Column(DataType.STRING)
  recipient!: string

  @Column(DataType.JSONB)
  params!: object

  @Column(DataType.STRING)
  messageId?: string

  @Column(DataType.STRING)
  errorCode!: string | null

  @Column({
    type: DataType.ENUM(...Object.values(MessageStatus)),
    allowNull: true,
  })
  status?: MessageStatus

  @Column(DataType.DATE)
  dequeuedAt?: Date

  @Column(DataType.DATE)
  sentAt?: Date

  @Column(DataType.DATE)
  deliveredAt?: Date

  @Column(DataType.DATE)
  receivedAt?: Date
}
