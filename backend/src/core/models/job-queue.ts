import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript'

import { Project } from './project'
import { Worker } from './worker'

@Table({ tableName: 'job_queue' })
export class JobQueue extends Model<JobQueue> {
  @ForeignKey(() => Project)
  @Column(DataType.INTEGER)
  projectId!: string

  @BelongsTo(() => Project)
  project!: Project

  @Column({
    type: DataType.NUMBER
  })
  workerId!: number

  @BelongsTo(() => Worker)
  worker: Worker

  @Column({
    type: DataType.ENUM(...Object.values(JOB_STATUS)),
    allowNull: false,
  })
  status!: JOB_STATUS

}