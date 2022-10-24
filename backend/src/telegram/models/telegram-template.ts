import { Campaign } from '@core/models/campaign'
import { TelegramTemplateService } from '@telegram/services'
import {
  BeforeCreate,
  BeforeUpdate,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript'

@Table({ tableName: 'telegram_templates', underscored: true, timestamps: true })
export class TelegramTemplate extends Model<TelegramTemplate> {
  @ForeignKey(() => Campaign)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  campaignId!: number

  @BelongsTo(() => Campaign)
  campaign!: Campaign

  @Column({
    type: DataType.TEXT,
  })
  body?: string

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  params?: Array<string>

  @BeforeUpdate
  @BeforeCreate
  static generateParams(instance: TelegramTemplate): void {
    if (!instance.body) return
    const parsedTemplate = TelegramTemplateService.client.parseTemplate(
      instance.body
    )
    instance.params = parsedTemplate.variables
  }
}
