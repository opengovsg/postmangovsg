import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript'

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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  logo_uri?: string
}
