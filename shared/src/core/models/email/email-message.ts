import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
} from 'sequelize-typescript'
import { Campaign } from '@models/campaign'
import { MessageStatus } from '../../constants'
import { Unsubscriber } from '@models/unsubscriber'

@Table({ tableName: 'email_messages', underscored: true, timestamps: true })
export class EmailMessage extends Model<EmailMessage> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @ForeignKey(() => Campaign)
  @ForeignKey(() => Unsubscriber)
  @Column(DataType.INTEGER)
  campaignId!: number

  @BelongsTo(() => Campaign)
  campaign!: Campaign

  @ForeignKey(() => Unsubscriber)
  @Column(DataType.STRING)
  recipient!: string

  @BelongsTo(() => Unsubscriber)
  unsubscriber?: Unsubscriber

  @Column(DataType.JSONB)
  params!: object

  @Column({ type: DataType.STRING, allowNull: true })
  messageId?: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  errorCode?: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  errorSubType?: string | null

  @Column({
    type: DataType.ENUM(...Object.values(MessageStatus)),
    allowNull: true,
  })
  status?: MessageStatus | null

  @Column({ type: DataType.DATE, allowNull: true })
  dequeuedAt?: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  sentAt?: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  deliveredAt?: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  receivedAt?: Date | null
}
