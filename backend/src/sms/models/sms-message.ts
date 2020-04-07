import { Column, DataType, ForeignKey, Model, Table, BelongsTo } from 'sequelize-typescript'
import { Campaign } from '@core/models/campaign'

@Table({ tableName: 'sms_messages' , underscored: true, timestamps: true })
export class SmsMessage extends Model<SmsMessage> {
  @ForeignKey(() => Campaign)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  campaignId!: number

  @BelongsTo(() => Campaign)
  campaign!: Campaign

  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  recipient!: string

  @Column(DataType.JSON)
  params!: object

  @Column(DataType.STRING)
  messageId?: string

  @Column(DataType.STRING)
  errorCode?: string

  @Column(DataType.DATE)
  dequeuedAt?: Date
  
  @Column(DataType.DATE)
  sentAt?: Date
  
  @Column(DataType.DATE)
  deliveredAt?: Date

  @Column(DataType.DATE)
  receivedAt?: Date

}
