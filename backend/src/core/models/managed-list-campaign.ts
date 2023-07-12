import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript'
import { Campaign } from '@core/models/campaign'

@Table({
  tableName: 'managed_list_campaigns',
  underscored: true,
  timestamps: true,
})
export class ManagedListCampaign extends Model<ManagedListCampaign> {
  @ForeignKey(() => Campaign)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true,
  })
  campaignId: number

  @BelongsTo(() => Campaign)
  campaign!: Campaign

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  managedListId!: number
}
