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

import { Campaign } from '@models/campaign'
import { TemplateClient, XSS_TELEGRAM_OPTION } from 'templating'

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
    const templateClient = new TemplateClient({
      xssOptions: XSS_TELEGRAM_OPTION,
    })

    const parsedTemplate = templateClient.parseTemplate(instance.body)
    instance.params = parsedTemplate.variables
  }
}
