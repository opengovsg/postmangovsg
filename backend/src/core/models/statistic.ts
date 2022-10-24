import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

import { Campaign } from './campaign'

@Table({ tableName: 'statistics', underscored: true, timestamps: true })
export class Statistic extends Model<Statistic> {
  @ForeignKey(() => Campaign)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  campaignId!: number

  @Column(DataType.INTEGER)
  unsent!: number

  @Column(DataType.INTEGER)
  errored!: number

  @Column(DataType.INTEGER)
  sent!: number

  @Column(DataType.INTEGER)
  invalid!: number
}
