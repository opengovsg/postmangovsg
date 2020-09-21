import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'verified_email', underscored: true, timestamps: true })
export class VerifiedEmail extends Model<VerifiedEmail> {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  email!: string
}
