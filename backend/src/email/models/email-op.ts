import { MessageStatus } from '@core/constants'
import { Campaign } from '@core/models/campaign'
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

@Table({ tableName: 'email_ops', underscored: true, timestamps: true })
export class EmailOp extends Model<EmailOp> {
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
  errorCode?: string

  @Column(DataType.STRING)
  errorSubType?: string

  @Column({
    // Explicitly typed since sequelize creates a new enum with a different name (https://github.com/sequelize/sequelize/issues/2577)
    type: 'enum_email_messages_status',
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
