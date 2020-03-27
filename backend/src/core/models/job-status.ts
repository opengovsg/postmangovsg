import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript'

import { Project } from './project'

@Table({ tableName: 'job_status' })
export class JobStatus extends Model<JobStatus> {
  @ForeignKey(() => Project)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  projectId!: string

  @BelongsTo(() => Project)
  project!: Project

  @Column(DataType.STRING)
  credential!: string

  @Column({
    type: DataType.NUMBER
  })
  workerId!: number

}