import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { JobStatus } from '@core/constants'
import { Project } from './project'
import { Worker } from './worker'

@Table({ tableName: 'job_queue' })
export class JobQueue extends Model<JobQueue> {
  @ForeignKey(() => Project)
  @Column(DataType.INTEGER)
  projectId!: number

  @BelongsTo(() => Project)
  project!: Project

  @ForeignKey(() => Worker)
  @Column(DataType.INTEGER)
  workerId?: number

  @BelongsTo(() => Worker)
  worker?: Worker

  @Column(DataType.INTEGER)
  sendRate?: number

  @Column({
    type: DataType.ENUM(...Object.values(JobStatus)),
    allowNull: false,
  })
  status!: JobStatus

}