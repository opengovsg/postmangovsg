import { UserCredential } from '@core/models'
import { User } from '@core/models/user/user'
import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { MessageStatus } from '@core/constants'

export enum TransactionalSmsMessageStatus {
  Unsent = 'UNSENT',
  Accepted = 'ACCEPTED',
  Sent = 'SENT',
  Bounced = 'BOUNCED',
  Delivered = 'DELIVERED',
  Opened = 'OPENED',
  Complaint = 'COMPLAINT',
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
    type: DataType.ENUM(...Object.values(MessageStatus)),
    allowNull: false,
  })
  status: MessageStatus

  @Column({ type: DataType.STRING, allowNull: true })
  errorCode: string | null
}
