import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript'
import { JobStatus } from '@core/constants'
import { Campaign } from './campaign'
import { Worker } from './worker'

@Table({ tableName: 'job_queue', underscored: true, timestamps: true })
export class JobQueue extends Model<JobQueue> {
  @ForeignKey(() => Campaign)
  @Column(DataType.INTEGER)
  campaignId!: number

  @BelongsTo(() => Campaign)
  campaign!: Campaign

  @ForeignKey(() => Worker)
  @Column(DataType.STRING)
  workerId?: string

  @BelongsTo(() => Worker)
  worker?: Worker

  @Column(DataType.INTEGER)
  sendRate?: number

  @Column({
    type: DataType.ENUM(...Object.values(JobStatus)),
    allowNull: false,
  })
  status!: JobStatus

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: new Date(),
  })
  visibleAt?: Date
}
