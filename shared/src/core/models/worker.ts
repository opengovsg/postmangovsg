import { Model, Table, Column, DataType, HasMany } from 'sequelize-typescript'
import { JobQueue } from '@models/job-queue'

@Table({ tableName: 'workers', underscored: true, timestamps: true })
export class Worker extends Model<Worker> {
  @HasMany(() => JobQueue, { as: 'job_queue' })
  @Column({
    type: DataType.STRING,
    allowNull: false,
    primaryKey: true,
  })
  id!: string
}
