import { DataType, Model, Column, Table } from 'sequelize-typescript'

@Table({ tableName: 'agencies', underscored: true, timestamps: true })
export class Agency extends Model<Agency> {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  domain!: string
}
