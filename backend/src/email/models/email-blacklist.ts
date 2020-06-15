import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'email_blacklist', underscored: true, timestamps: true })
export class EmailBlacklist extends Model<EmailBlacklist> {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  recipient!: string
}
