import {
  DataType,
  Model,
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript'
import { Agency } from './agency'
import { User } from './user/user'

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
