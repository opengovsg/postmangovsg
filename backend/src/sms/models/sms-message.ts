import { Column, DataType, ForeignKey, Model, Table, BelongsTo } from 'sequelize-typescript'
import { Project } from '@core/models/project'

@Table({ tableName: 'sms_messages' })
export class SmsMessage extends Model<SmsMessage> {
  @ForeignKey(() => Project)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  projectId!: number

  @BelongsTo(() => Project)
  project!: Project

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
