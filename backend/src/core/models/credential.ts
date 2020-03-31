import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'credentials' })
export class Credential extends Model<Credential> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    primaryKey: true
  })
  name!: string

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  validated!: boolean

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  used!: boolean

}