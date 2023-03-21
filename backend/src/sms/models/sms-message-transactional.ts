import { UserCredential } from '@core/models'
import { User } from '@core/models/user/user'
import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

export enum TransactionalSmsMessageStatus {
  Unsent = 'UNSENT',
  Accepted = 'ACCEPTED',
  Sent = 'SENT',
  Delivered = 'DELIVERED',
  Error = 'ERROR',
}

@Table({
  tableName: 'sms_messages_transactional',
  underscored: true,
  timestamps: true,
})
export class SmsMessageTransactional extends Model<SmsMessageTransactional> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number

  @ForeignKey(() => User)
  @Column({ type: DataType.STRING, allowNull: false })
  userId: string

  @ForeignKey(() => UserCredential)
  @Column({ type: DataType.STRING, allowNull: false })
  credentialsLabel: string

  @Column({ type: DataType.STRING, allowNull: false })
  recipient: string

  @Column({ type: DataType.TEXT, allowNull: false })
  body: string

  @Column({ type: DataType.STRING, allowNull: true })
  messageId: string | null

  @Column({
    type: DataType.ENUM(...Object.values(TransactionalSmsMessageStatus)),
    allowNull: false,
  })
  status: TransactionalSmsMessageStatus

  @Column({ type: DataType.STRING, allowNull: true })
  errorCode: string | null

  @Column({ type: DataType.DATE, allowNull: true })
  acceptedAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  sentAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  deliveredAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  erroredAt: Date | null
}
