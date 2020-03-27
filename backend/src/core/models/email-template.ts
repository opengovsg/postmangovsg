import { Column, DataType, ForeignKey, Model, Table, BelongsTo } from 'sequelize-typescript'
import { Project } from './project'

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
  template!: string

  @Column({
    type: DataType.STRING,
  })
  subject!: string
}