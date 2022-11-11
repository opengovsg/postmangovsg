import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'email_from_address', underscored: true, timestamps: true })
export class EmailFromAddress extends Model<EmailFromAddress> {
  @Column({
    type: DataType.TEXT,
    primaryKey: true,
  })
  email!: string
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  name?: string
}
