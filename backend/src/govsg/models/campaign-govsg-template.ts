import { Campaign } from '@core/models'
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { GovsgTemplate } from './govsg-template'

// Note: Campaign -> GovsgTemplate is actually a many -> one relationship
//   but we're creating a pivot table to not have to modify campaign table,
//   which, in tandem with the old set up of templates for other channels,
//   will greatly confuse readers
@Table({
  tableName: 'campaign_govsg_template',
  underscored: true,
  timestamps: false,
})
export class CampaignGovsgTemplate extends Model<CampaignGovsgTemplate> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number

  @ForeignKey(() => Campaign)
  @Column(DataType.BIGINT)
  campaignId!: number

  @BelongsTo(() => Campaign)
  campaign: Campaign

  @ForeignKey(() => GovsgTemplate)
  @Column(DataType.BIGINT)
  govsgTemplateId!: number

  @BelongsTo(() => GovsgTemplate)
  govsgTemplate: GovsgTemplate

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  forSingleRecipient: boolean
}
