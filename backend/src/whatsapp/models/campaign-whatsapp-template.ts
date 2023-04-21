import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { Campaign } from '@core/models'
import { WhatsappTemplate } from '@whatsapp/models/whatsapp-template'

@Table({
  tableName: 'campaign_whatsapp_templates',
  underscored: true,
  timestamps: true,
})
export class CampaignWhatsappTemplate extends Model<CampaignWhatsappTemplate> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number
  @ForeignKey(() => Campaign)
  @Column({
    type: DataType.INTEGER,
  })
  campaignId!: number

  @BelongsTo(() => Campaign)
  campaign!: Campaign

  @ForeignKey(() => WhatsappTemplate)
  @Column({
    type: DataType.INTEGER,
  })
  whatsappTemplateId!: number

  @BelongsTo(() => WhatsappTemplate)
  whatsappTemplate: WhatsappTemplate
}
