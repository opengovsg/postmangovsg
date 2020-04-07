import { Column, DataType, ForeignKey, Model, Table, BelongsTo } from 'sequelize-typescript'
import { Project } from '@core/models/campaign'

@Table({ tableName: 'email_templates' })
export class EmailTemplate extends Model<EmailTemplate> {
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
  body!: string

  @Column({
    type: DataType.TEXT,
  })
  subject!: string
}