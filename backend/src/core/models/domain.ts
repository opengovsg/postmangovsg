import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript'

import { User } from './user/user'
import { Agency } from './agency'

@Table({ tableName: 'domains', underscored: true, timestamps: true })
export class Domain extends Model<Domain> {
  @HasMany(() => User, { as: 'user' })
  @Column({
    type: DataType.STRING,
    primaryKey: true,
    allowNull: false,
  })
  domain!: string

  @ForeignKey(() => Agency)
  @Column(DataType.INTEGER)
  agencyId?: number

  @BelongsTo(() => Agency)
  agency?: Agency
}
