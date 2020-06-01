import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'credentials', underscored: true, timestamps: true })
export class Credential extends Model<Credential> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    primaryKey: true,
  })
  name!: string
}
