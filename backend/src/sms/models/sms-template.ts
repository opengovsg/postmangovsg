import { Column, DataType, ForeignKey, Model, Table, BelongsTo } from 'sequelize-typescript'
import { Project } from '@core/models/campaign'

@Table({ tableName: 'sms_templates' })
export class SmsTemplate extends Model<SmsTemplate> {
  @ForeignKey(() => Project)
  @Column({
    type:DataType.INTEGER,
    primaryKey: true,
  })
  projectId!: number

  @BelongsTo(() => Project)
  project!: Project

  @Column({
    type: DataType.TEXT,
  })
  body?: string
}