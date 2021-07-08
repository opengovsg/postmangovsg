import { DataType, Model, Column, Table, HasMany } from 'sequelize-typescript'
import { Domain } from './domain'

@Table({ tableName: 'agencies', underscored: true, timestamps: true })
export class Agency extends Model<Agency> {
  @HasMany(() => Domain, { as: 'domain' })
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  logo_uri?: string
}
