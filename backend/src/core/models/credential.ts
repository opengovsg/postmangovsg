import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'credentials' })
export class Credential extends Model<Credential> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    primaryKey: true
  })
  name!: string

  @Column(DataType.BOOLEAN)
  validated?: boolean

  @Column(DataType.BOOLEAN)
  used?: boolean

}