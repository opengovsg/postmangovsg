import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'
import { Campaign } from '@core/models'
import { WhatsappTemplate } from '@whatsapp/models/whatsapp-template'

// This is a many-to-many single record table to join campaign and whatsapp_templates table
// Primarily due to the fact that we do not want to alter to primary campaign table for whatsapp
@Table({ tableName: 'campaign_whatsapp_templates', underscored: true })
export class CampaignWhatsappTemplate extends Model<CampaignWhatsappTemplate> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number

  @ForeignKey(() => Campaign)
  @Column(DataType.INTEGER)
  campaignId!: number

  @ForeignKey(() => WhatsappTemplate)
  @Column(DataType.INTEGER)
  whatsappTemplateId!: number
}
