import { Column, DataType, ForeignKey, Model, Table, BelongsTo } from 'sequelize-typescript'

import { Project } from './project'

@Table({ tableName: 'message_logs' })
export class MessageLog extends Model<MessageLog> {
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

  @Column(DataType.STRING)
  messageId?: string

  @Column(DataType.DATE)
  pickedUpAt?: Date

  @Column(DataType.DATE)
  sentAt?: Date

  @Column(DataType.DATE)
  deliveredAt?: Date

}

