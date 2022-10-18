import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { User } from '@core/models'

export enum TransactionalEmailMessageStatus {
  Unsent = 'UNSENT',
  Accepted = 'ACCEPTED',
  Sent = 'SENT',
  Bounced = 'BOUNCED',
  Delivered = 'DELIVERED',
  Opened = 'OPENED',
  Complaint = 'COMPLAINT',
}

export type AttachmentsMetadata = AttachmentMetadata[]

interface AttachmentMetadata {
  fileName: string
  fileSize: number // in bytes
  hash: string
}

@Table({
  tableName: 'email_messages_transactional',
  underscored: true,
  timestamps: true,
})
export class EmailMessageTransactional extends Model<EmailMessageTransactional> {
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

  @Column({ type: DataType.STRING, allowNull: true })
  from: string

  @Column({ type: DataType.STRING, allowNull: false })
  recipient: string

  @Column({ type: DataType.JSONB, allowNull: false })
  params: Record<string, string>

  @Column({ type: DataType.STRING, allowNull: true })
  messageId: string | null

  @Column({ type: DataType.ARRAY(DataType.JSONB), allowNull: true })
  attachmentsMetadata: AttachmentsMetadata | null

  @Column({
    type: DataType.ENUM(...Object.values(TransactionalEmailMessageStatus)),
    allowNull: false,
  })
  status: TransactionalEmailMessageStatus

  /*
   * see https://www.notion.so/opengov/23-Sep-2022-RFC-for-Saving-Emails-Sent-via-API-e4d29e9488004bcbb430ab15c9ef589f#bae59004a81846618552922e3751e012 for detailed discussion on errorCode and errorSubType
   * */

  // will only handle the non-callback error codes for now
  @Column({ type: DataType.STRING, allowNull: true })
  errorCode: string | null

  // this is the error type returned by AWS SES; to be handled when callback is supported
  // @Column({ type: DataType.STRING, allowNull: true })
  // errorSubType: string | null

  /*
   * TODO: capture key timestamps in email's lifecycle and align with email_messages table
   * https://www.notion.so/opengov/Support-callbacks-in-transactional-emails-cade9647b2264a28a9a4d7eca301846a
   * */
  // this is equivalent to `sent_at` from `email_messages` table
  // TODO: remove above comment once the fields have been aligned for the 2 tables
  @Column({ type: DataType.DATE, allowNull: true })
  acceptedAt: Date | null

  // Note: This is not the same as `sent_at` from `email_messages` table, this is
  // to handle `Send` events from SES callbacks
  @Column({ type: DataType.DATE, allowNull: true })
  sentAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  deliveredAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  openedAt: Date | null
}
