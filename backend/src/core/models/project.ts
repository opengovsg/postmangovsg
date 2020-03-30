import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { User } from './user'
import { ProjectType } from './project-type'

@Table({ tableName: 'projects' })
export class Project extends Model<Project> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string

  @ForeignKey(() => User)
  @Column
  creator!: number

  @ForeignKey(() => ProjectType)
  @Column
  type!: string

  @Column(DataType.STRING)
  credName?: string

  @Column(DataType.JSON)
  s3Object?: object

  @BelongsTo(() => User)
  user!: User
}