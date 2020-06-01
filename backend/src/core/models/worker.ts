import { Model, Table, Column, DataType } from 'sequelize-typescript'

@Table({ tableName: 'workers', underscored: true, timestamps: true })
export class Worker extends Model<Worker> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    primaryKey: true,
  })
  id!: string
}
