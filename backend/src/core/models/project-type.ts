import { Column, DataType, Model, Table } from 'sequelize-typescript'

export enum PROJECT_TYPE {
  EMAIL = 'email',
  SMS = 'sms'
}

@Table({ tableName: 'project_types' })
export class ProjectType extends Model<ProjectType> {
  @Column({
    type: DataType.ENUM(...Object.values(PROJECT_TYPE)),
    allowNull: false,
    primaryKey: true
  })
  type!: PROJECT_TYPE

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string

}