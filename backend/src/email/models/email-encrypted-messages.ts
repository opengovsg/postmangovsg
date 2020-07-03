import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
} from 'sequelize-typescript'
import { Campaign } from '@core/models/campaign'

@Table({ tableName: 'email_messages', underscored: true, timestamps: true })
export class EmailEncryptedMessages extends Model<EmailEncryptedMessages> {
  @Column({
    primaryKey: true,
  })
  id!: number

  @ForeignKey(() => Campaign)
  @Column(DataType.INTEGER)
  campaignId!: number

  @BelongsTo(() => Campaign)
  campaign!: Campaign

  @Column(DataType.TEXT)
  payload!: string

  @Column(DataType.STRING)
  passwordHash!: string
}
