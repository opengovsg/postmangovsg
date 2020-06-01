import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
} from 'sequelize-typescript'
import { Campaign } from './campaign'
import { QueryTypes } from 'sequelize'

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

  static async updateStats(campaignId: number): Promise<void> {
    await this.sequelize?.query('SELECT update_stats(:campaignId);', {
      replacements: {
        campaignId,
      },
      type: QueryTypes.SELECT,
    })
    return
  }
}
