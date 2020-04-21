import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'api_keys' , underscored: true, timestamps: true })
export class ApiKey extends Model<Credential> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    primaryKey: true,
  })
  hash!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  email!: string
}