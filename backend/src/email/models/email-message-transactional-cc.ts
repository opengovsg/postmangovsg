import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { EmailMessageTransactional } from './email-message-transactional'

export enum CcType {
  Cc = 'CC',
  Bcc = 'BCC',
}
@Table({
  tableName: 'email_messages_transactional_cc',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      name: 'unique_cc_recipient_per_email',
      unique: true,
      fields: ['email_message_transactional_id', 'email', 'cc_type'],
    },
  ],
})
export class EmailMessageTransactionalCc extends Model<EmailMessageTransactionalCc> {
  @ForeignKey(() => EmailMessageTransactional)
  @Column({
    type: DataType.STRING,
    allowNull: false,
    primaryKey: true,
  })
  emailMessageTransactionalId: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
    primaryKey: true,
  })
  email: string

  @Column({
    type: DataType.ENUM(...Object.values(CcType)),
    allowNull: false,
    primaryKey: true,
  })
  ccType: CcType

  @Column({ type: DataType.STRING, allowNull: true })
  errorCode: string | null
}
