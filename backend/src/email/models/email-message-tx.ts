import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { User } from '@core/models'

// identical to CampaignS3ObjectInterface; to tweak and abstract if necessary
interface AttachmentS3ObjectInterface {
  key?: string
  bucket?: string
  filename?: string
  temp_filename?: string
  error?: string
}

export enum TransactionalEmailMessageStatus {
  Unsent = 'UNSENT',
  // AttachmentTooLargeError = 'ATTACHMENT_TOO_LARGE_ERROR', // unused
  // TooManyAttachmentsError = 'TOO_MANY_ATTACHMENTS_ERROR', // unused
  // InvalidParamsError = 'INVALID_PARAMS_ERROR', // unused; these are errors caught by Joi
  InvalidFromAddressError = 'INVALID_FROM_ADDRESS_ERROR',
  RateLimitError = 'RATE_LIMIT_ERROR',
  InvalidMessageError = 'INVALID_MESSAGE_ERROR',
  UnsupportedFileTypeError = 'UNSUPPORTED_FILE_TYPE_ERROR',
  MaliciousFileError = 'MALICIOUS_FILE_ERROR',
  BlacklistedRecipientError = 'BLACKLISTED_RECIPIENT_ERROR',
  Accepted = 'ACCEPTED',
  Sent = 'SENT',
  // unsupported for now
  // Bounced = 'BOUNCED',
  // Delivered = 'DELIVERED',
  // Opened = 'OPENED',
  // Complaint = 'COMPLAINT',
}

@Table({ tableName: 'email_messages_tx', underscored: true, timestamps: true })
export class EmailMessageTx extends Model<EmailMessageTx> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id!: number

  @ForeignKey(() => User)
  @Column({ type: DataType.STRING, allowNull: false })
  userEmail!: string

  @Column({ type: DataType.STRING, allowNull: false })
  fromName!: string

  @Column({ type: DataType.STRING, allowNull: false })
  fromAddress!: string

  @Column({ type: DataType.STRING, allowNull: false })
  recipient!: string

  @Column({ type: DataType.JSON, allowNull: false })
  params!: Record<string, string>

  @Column(DataType.STRING)
  messageId?: string

  @Column({ type: DataType.BOOLEAN, allowNull: false })
  hasAttachment!: boolean

  // null if hasAttachment is false
  @Column({ type: DataType.JSON, allowNull: true })
  attachmentS3Object!: AttachmentS3ObjectInterface | null
  // @Column(DataType.STRING)
  // messageId: string | null

  @Column({
    type: DataType.ENUM(...Object.values(TransactionalEmailMessageStatus)),
    allowNull: false,
  })
  status!: TransactionalEmailMessageStatus

  // will be null upon first creation
  @Column({ type: DataType.DATE, allowNull: true })
  sentAt!: Date | null

  // will only handle the non-callback error codes for now
  // callback error codes are strings
  // non-callback error codes are numbers; so use string for now
  @Column({ type: DataType.STRING, allowNull: true })
  errorCode!: string | null

  // this is the error type returned by AWS SES; to be handled when callback is supported
  // @Column(DataType.STRING)
  // errorSubType?: string

  // @Column(DataType.DATE)
  // deliveredAt!: Date | null

  // @Column(DataType.DATE)
  // receivedAt!: Date | null
  // static async updateS3ObjectKey(
  //   id: number,
  //   objectToMerge: AttachmentS3ObjectInterface
  // ): Promise<void> {
  //   // TODO see if needed; reference from backend/src/core/models/campaign.ts
  //   await EmailMessageTx.sequelize?.transaction()
  // }
}
