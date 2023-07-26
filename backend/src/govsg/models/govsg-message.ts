import { GovsgMessageStatus } from '@core/constants'
import { Campaign } from '@core/models'
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

@Table({ tableName: 'govsg_messages', underscored: true, timestamps: true })
export class GovsgMessage extends Model<GovsgMessage> {
  @ForeignKey(() => Campaign)
  @Column(DataType.BIGINT)
  campaignId: number

  @BelongsTo(() => Campaign)
  campaign: Campaign

  @Column(DataType.STRING)
  recipient: string

  @Column(DataType.JSONB)
  params: object

  // indexed and unique for faster lookup
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
  dequeuedAt: Date | null

  // Equivalent to `sentAt` per the previous convention
  // Added this extra field so we can use senAt for the actual delivery
  // notification from service provider
  @Column({ type: DataType.DATE, allowNull: true })
  sendAttemptedAt: Date | null

  // Equivalent to deliveredAt per the previous convention
  // Making this change to align between campaign vs txn messages for this channel
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

  @Column({ type: DataType.DATE, allowNull: true })
  deletedByUserAt: Date | null

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: 'en_GB' })
  languageCode: string
}
