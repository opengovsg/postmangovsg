import {
  DataType,
  Model,
  Column,
  Table,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript'
import { Agency } from './agency'

@Table({ tableName: 'domains', underscored: true, timestamps: true })
export class Domain extends Model<Domain> {
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
